import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import date
from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB


class MatrixGenerator:
    """Generate analytics matrices from BNI data."""
    
    def __init__(self, chapter_members: List[Member]):
        self.members = sorted(chapter_members, key=lambda m: m.full_name)
        self.member_names = [m.full_name for m in self.members]
        self.member_lookup = {m.id: m.full_name for m in self.members}
    
    def generate_referral_matrix(self, referrals: List[Referral]) -> pd.DataFrame:
        """Generate referral matrix showing who referred to whom. OPTIMIZED with vectorization."""
        # Create empty matrix
        matrix = pd.DataFrame(
            0,
            index=self.member_names,
            columns=self.member_names
        )

        if not referrals:
            return matrix

        # Vectorized approach: create DataFrame from referrals and use groupby
        referral_data = [(r.giver.full_name, r.receiver.full_name) for r in referrals]
        if referral_data:
            ref_df = pd.DataFrame(referral_data, columns=['giver', 'receiver'])
            counts = ref_df.groupby(['giver', 'receiver']).size()

            for (giver_name, receiver_name), count in counts.items():
                if giver_name in matrix.index and receiver_name in matrix.columns:
                    matrix.loc[giver_name, receiver_name] = count

        return matrix
    
    def generate_one_to_one_matrix(self, one_to_ones: List[OneToOne]) -> pd.DataFrame:
        """Generate one-to-one meeting matrix. OPTIMIZED with vectorization."""
        # Create empty matrix
        matrix = pd.DataFrame(
            0,
            index=self.member_names,
            columns=self.member_names
        )

        if not one_to_ones:
            return matrix

        # Vectorized approach: create DataFrame and use groupby
        meeting_data = []
        for meeting in one_to_ones:
            meeting_data.append((meeting.member1.full_name, meeting.member2.full_name))
            # Bidirectional
            meeting_data.append((meeting.member2.full_name, meeting.member1.full_name))

        if meeting_data:
            oto_df = pd.DataFrame(meeting_data, columns=['member1', 'member2'])
            counts = oto_df.groupby(['member1', 'member2']).size()

            for (member1_name, member2_name), count in counts.items():
                if member1_name in matrix.index and member2_name in matrix.columns:
                    matrix.loc[member1_name, member2_name] = count

        return matrix
    
    def generate_combination_matrix(self, referrals: List[Referral],
                                   one_to_ones: List[OneToOne],
                                   ref_matrix: pd.DataFrame = None,
                                   oto_matrix: pd.DataFrame = None) -> pd.DataFrame:
        """Generate combination matrix showing relationships between members. OPTIMIZED with vectorization."""
        # Accept pre-generated matrices to avoid regeneration
        if ref_matrix is None:
            ref_matrix = self.generate_referral_matrix(referrals)
        if oto_matrix is None:
            oto_matrix = self.generate_one_to_one_matrix(one_to_ones)

        # Vectorized combination: use numpy operations
        # 0 = Neither, 1 = OTO only, 2 = Referral only, 3 = Both
        ref_array = (ref_matrix > 0).astype(int) * 2  # Referral = 2
        oto_array = (oto_matrix > 0).astype(int) * 1  # OTO = 1
        matrix = ref_array + oto_array  # Combine: 0, 1, 2, or 3

        # Set diagonal to 0 (no self-relationships)
        np.fill_diagonal(matrix.values, 0)

        return matrix
    
    def generate_tyfcb_summary(self, tyfcbs: List[TYFCB]) -> pd.DataFrame:
        """Generate TYFCB summary by member."""
        data = []
        
        for member in self.members:
            # Count TYFCBs received
            received_tyfcbs = [t for t in tyfcbs if t.receiver == member]
            total_received = sum(float(t.amount) for t in received_tyfcbs)
            count_received = len(received_tyfcbs)
            
            # Count TYFCBs given (if giver is specified)
            given_tyfcbs = [t for t in tyfcbs if t.giver == member]
            total_given = sum(float(t.amount) for t in given_tyfcbs)
            count_given = len(given_tyfcbs)
            
            data.append({
                'Member': member.full_name,
                'TYFCB_Received_Count': count_received,
                'TYFCB_Received_Amount': total_received,
                'TYFCB_Given_Count': count_given,
                'TYFCB_Given_Amount': total_given,
                'Net_Amount': total_received - total_given
            })
        
        return pd.DataFrame(data)
    
    def generate_member_summary(self, referrals: List[Referral], 
                               one_to_ones: List[OneToOne],
                               tyfcbs: List[TYFCB]) -> pd.DataFrame:
        """Generate comprehensive member summary."""
        data = []
        
        for member in self.members:
            # Referral stats
            refs_given = [r for r in referrals if r.giver == member]
            refs_received = [r for r in referrals if r.receiver == member]
            
            # One-to-one stats
            otos = [o for o in one_to_ones 
                   if o.member1 == member or o.member2 == member]
            
            # TYFCB stats
            tyfcbs_received = [t for t in tyfcbs if t.receiver == member]
            tyfcbs_given = [t for t in tyfcbs if t.giver == member]
            
            # Unique member counts
            unique_refs_given = len(set(r.receiver.id for r in refs_given))
            unique_refs_received = len(set(r.giver.id for r in refs_received))
            unique_otos = len(set(
                o.member2.id if o.member1 == member else o.member1.id 
                for o in otos
            ))
            
            data.append({
                'Member': member.full_name,
                'Referrals_Given': len(refs_given),
                'Referrals_Received': len(refs_received),
                'Unique_Referrals_Given': unique_refs_given,
                'Unique_Referrals_Received': unique_refs_received,
                'One_to_Ones': len(otos),
                'Unique_One_to_Ones': unique_otos,
                'TYFCB_Count_Received': len(tyfcbs_received),
                'TYFCB_Amount_Received': sum(float(t.amount) for t in tyfcbs_received),
                'TYFCB_Count_Given': len(tyfcbs_given),
                'TYFCB_Amount_Given': sum(float(t.amount) for t in tyfcbs_given),
            })
        
        return pd.DataFrame(data)


class NameMatcher:
    """Utility for matching member names from Excel data."""
    
    @staticmethod
    def normalize_name(name: str) -> str:
        """Normalize name for consistent matching."""
        if not name:
            return ""
        
        # Convert to lowercase and remove extra spaces
        normalized = ' '.join(str(name).lower().split())
        
        # Remove common prefixes/suffixes
        prefixes = ['mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sir', 'madam']
        suffixes = ['jr.', 'sr.', 'ii', 'iii', 'iv', 'v']
        
        parts = normalized.split()
        
        # Remove prefixes
        if parts and parts[0] in prefixes:
            parts = parts[1:]
        
        # Remove suffixes
        if parts and parts[-1] in suffixes:
            parts = parts[:-1]
        
        return ' '.join(parts)
    
    @staticmethod
    def create_fuzzy_variants(name: str) -> List[str]:
        """Create fuzzy matching variants of a name."""
        variants = [name.lower().strip()]
        
        # Add normalized version
        normalized = NameMatcher.normalize_name(name)
        if normalized not in variants:
            variants.append(normalized)
        
        # Add first name only
        parts = name.split()
        if len(parts) > 1:
            variants.append(parts[0].lower())
        
        # Add last name only
        if len(parts) > 1:
            variants.append(parts[-1].lower())
        
        # Add initials + last name
        if len(parts) > 1:
            first_initial = parts[0][0].lower() if parts[0] else ""
            last_name = parts[-1].lower()
            if first_initial:
                variants.append(f"{first_initial}. {last_name}")
                variants.append(f"{first_initial} {last_name}")
        
        return list(set(variants))  # Remove duplicates
    
    @staticmethod
    def find_best_match(target_name: str, member_list: List[Member], 
                       threshold: float = 0.8) -> Optional[Member]:
        """Find best matching member using fuzzy matching."""
        from difflib import SequenceMatcher
        
        if not target_name:
            return None
        
        target_variants = NameMatcher.create_fuzzy_variants(target_name)
        best_match = None
        best_score = 0.0
        
        for member in member_list:
            member_variants = NameMatcher.create_fuzzy_variants(member.full_name)
            
            # Check all combinations of variants
            for target_var in target_variants:
                for member_var in member_variants:
                    score = SequenceMatcher(None, target_var, member_var).ratio()
                    if score > best_score and score >= threshold:
                        best_score = score
                        best_match = member
        
        return best_match


class DataValidator:
    """Validate imported data quality."""
    
    @staticmethod
    def validate_referrals(referrals: List[Referral]) -> Dict:
        """Validate referral data quality."""
        issues = {
            'self_referrals': [],
            'missing_members': [],
            'duplicate_referrals': []
        }
        
        seen_referrals = set()
        
        for referral in referrals:
            # Check for self-referrals
            if referral.giver == referral.receiver:
                issues['self_referrals'].append(referral)
            
            # Check for duplicates
            ref_key = (referral.giver.id, referral.receiver.id, referral.date_given)
            if ref_key in seen_referrals:
                issues['duplicate_referrals'].append(referral)
            else:
                seen_referrals.add(ref_key)
        
        return issues
    
    @staticmethod
    def validate_one_to_ones(one_to_ones: List[OneToOne]) -> Dict:
        """Validate one-to-one meeting data quality."""
        issues = {
            'self_meetings': [],
            'missing_members': [],
            'duplicate_meetings': []
        }
        
        seen_meetings = set()
        
        for meeting in one_to_ones:
            # Check for self-meetings
            if meeting.member1 == meeting.member2:
                issues['self_meetings'].append(meeting)
            
            # Check for duplicates (normalize order)
            meeting_key = tuple(sorted([meeting.member1.id, meeting.member2.id]))
            meeting_key = (*meeting_key, meeting.meeting_date)
            
            if meeting_key in seen_meetings:
                issues['duplicate_meetings'].append(meeting)
            else:
                seen_meetings.add(meeting_key)
        
        return issues
    
    @staticmethod
    def generate_quality_report(referrals: List[Referral], 
                              one_to_ones: List[OneToOne],
                              tyfcbs: List[TYFCB]) -> Dict:
        """Generate comprehensive data quality report."""
        ref_issues = DataValidator.validate_referrals(referrals)
        oto_issues = DataValidator.validate_one_to_ones(one_to_ones)
        
        total_records = len(referrals) + len(one_to_ones) + len(tyfcbs)
        total_issues = (
            len(ref_issues['self_referrals']) +
            len(ref_issues['duplicate_referrals']) +
            len(oto_issues['self_meetings']) +
            len(oto_issues['duplicate_meetings'])
        )
        
        quality_score = ((total_records - total_issues) / total_records * 100 
                        if total_records > 0 else 100)
        
        return {
            'overall_quality_score': quality_score,
            'total_records': total_records,
            'total_issues': total_issues,
            'referrals': {
                'total': len(referrals),
                'self_referrals': len(ref_issues['self_referrals']),
                'duplicates': len(ref_issues['duplicate_referrals']),
            },
            'one_to_ones': {
                'total': len(one_to_ones),
                'self_meetings': len(oto_issues['self_meetings']),
                'duplicates': len(oto_issues['duplicate_meetings']),
            },
            'tyfcbs': {
                'total': len(tyfcbs),
                'negative_amounts': len([t for t in tyfcbs if t.amount < 0]),
            }
        }