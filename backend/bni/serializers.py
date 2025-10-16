from rest_framework import serializers
from chapters.models import Chapter, AdminSettings
from members.models import Member
from analytics.models import Referral, OneToOne, TYFCB


class ChapterSerializer(serializers.ModelSerializer):
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = [
            "id",
            "name",
            "location",
            "meeting_day",
            "meeting_time",
            "members_count",
            "created_at",
            "updated_at",
        ]

    def get_members_count(self, obj):
        return obj.members.filter(is_active=True).count()


class MemberSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    referrals_given_count = serializers.SerializerMethodField()
    referrals_received_count = serializers.SerializerMethodField()
    one_to_ones_count = serializers.SerializerMethodField()
    tyfcbs_received_count = serializers.SerializerMethodField()
    tyfcbs_received_amount = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "normalized_name",
            "business_name",
            "classification",
            "email",
            "phone",
            "is_active",
            "joined_date",
            "referrals_given_count",
            "referrals_received_count",
            "one_to_ones_count",
            "tyfcbs_received_count",
            "tyfcbs_received_amount",
        ]

    def get_referrals_given_count(self, obj):
        return obj.referrals_given.count()

    def get_referrals_received_count(self, obj):
        return obj.referrals_received.count()

    def get_one_to_ones_count(self, obj):
        return obj.one_to_ones_as_member1.count() + obj.one_to_ones_as_member2.count()

    def get_tyfcbs_received_count(self, obj):
        return obj.tyfcbs_received.count()

    def get_tyfcbs_received_amount(self, obj):
        return sum(tyfcb.amount for tyfcb in obj.tyfcbs_received.all())


class ReferralSerializer(serializers.ModelSerializer):
    giver_name = serializers.CharField(source="giver.full_name", read_only=True)
    receiver_name = serializers.CharField(source="receiver.full_name", read_only=True)

    class Meta:
        model = Referral
        fields = [
            "id",
            "giver",
            "receiver",
            "giver_name",
            "receiver_name",
            "date_given",
            "week_of",
            "notes",
            "created_at",
        ]


class OneToOneSerializer(serializers.ModelSerializer):
    member1_name = serializers.CharField(source="member1.full_name", read_only=True)
    member2_name = serializers.CharField(source="member2.full_name", read_only=True)

    class Meta:
        model = OneToOne
        fields = [
            "id",
            "member1",
            "member2",
            "member1_name",
            "member2_name",
            "meeting_date",
            "week_of",
            "location",
            "duration_minutes",
            "notes",
            "created_at",
        ]


class TYFCBSerializer(serializers.ModelSerializer):
    receiver_name = serializers.CharField(source="receiver.full_name", read_only=True)
    giver_name = serializers.CharField(source="giver.full_name", read_only=True)

    class Meta:
        model = TYFCB
        fields = [
            "id",
            "receiver",
            "giver",
            "receiver_name",
            "giver_name",
            "amount",
            "currency",
            "within_chapter",
            "date_closed",
            "week_of",
            "description",
            "created_at",
        ]


class MemberCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new members with comprehensive validation."""

    class Meta:
        model = Member
        fields = [
            "first_name",
            "last_name",
            "business_name",
            "classification",
            "email",
            "phone",
            "joined_date",
            "chapter",
        ]

    def validate_first_name(self, value):
        """Validate first name."""
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required")
        if len(value) > 100:
            raise serializers.ValidationError("First name must be less than 100 characters")
        return value.strip()

    def validate_last_name(self, value):
        """Validate last name."""
        if not value or not value.strip():
            raise serializers.ValidationError("Last name is required")
        if len(value) > 100:
            raise serializers.ValidationError("Last name must be less than 100 characters")
        return value.strip()

    def validate_email(self, value):
        """Validate email format."""
        if value and value.strip():
            value = value.strip().lower()
            # Basic email format validation
            import re
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise serializers.ValidationError("Please enter a valid email address")
            if len(value) > 254:
                raise serializers.ValidationError("Email must be less than 254 characters")
        return value

    def validate_phone(self, value):
        """Validate phone number format."""
        if value and value.strip():
            value = value.strip()
            # Allow only digits, spaces, hyphens, parentheses, plus, and dots
            import re
            phone_regex = r'^[\d\s\-\(\)\+\.]+$'
            if not re.match(phone_regex, value):
                raise serializers.ValidationError("Phone number can only contain digits, spaces, hyphens, parentheses, plus signs, and dots")
            if len(value) > 20:
                raise serializers.ValidationError("Phone number must be less than 20 characters")
        return value

    def validate_business_name(self, value):
        """Validate business name."""
        if value and len(value) > 200:
            raise serializers.ValidationError("Business name must be less than 200 characters")
        return value.strip() if value else value

    def validate_classification(self, value):
        """Validate classification."""
        if value and len(value) > 100:
            raise serializers.ValidationError("Classification must be less than 100 characters")
        return value.strip() if value else value

    def create(self, validated_data):
        # Ensure normalized_name is set
        member = Member(**validated_data)
        member.normalized_name = Member.normalize_name(
            f"{member.first_name} {member.last_name}"
        )
        member.save()
        return member


class MemberUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing members with comprehensive validation."""

    class Meta:
        model = Member
        fields = [
            "first_name",
            "last_name",
            "business_name",
            "classification",
            "email",
            "phone",
            "joined_date",
            "is_active",
        ]

    def validate_first_name(self, value):
        """Validate first name."""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError("First name cannot be empty")
            if len(value) > 100:
                raise serializers.ValidationError("First name must be less than 100 characters")
            return value.strip()
        return value

    def validate_last_name(self, value):
        """Validate last name."""
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError("Last name cannot be empty")
            if len(value) > 100:
                raise serializers.ValidationError("Last name must be less than 100 characters")
            return value.strip()
        return value

    def validate_email(self, value):
        """Validate email format."""
        if value and value.strip():
            value = value.strip().lower()
            import re
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise serializers.ValidationError("Please enter a valid email address")
            if len(value) > 254:
                raise serializers.ValidationError("Email must be less than 254 characters")
        return value

    def validate_phone(self, value):
        """Validate phone number format."""
        if value and value.strip():
            value = value.strip()
            import re
            phone_regex = r'^[\d\s\-\(\)\+\.]+$'
            if not re.match(phone_regex, value):
                raise serializers.ValidationError("Phone number can only contain digits, spaces, hyphens, parentheses, plus signs, and dots")
            if len(value) > 20:
                raise serializers.ValidationError("Phone number must be less than 20 characters")
        return value

    def validate_business_name(self, value):
        """Validate business name."""
        if value and len(value) > 200:
            raise serializers.ValidationError("Business name must be less than 200 characters")
        return value.strip() if value else value

    def validate_classification(self, value):
        """Validate classification."""
        if value and len(value) > 100:
            raise serializers.ValidationError("Classification must be less than 100 characters")
        return value.strip() if value else value

    def update(self, instance, validated_data):
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update normalized_name if name fields changed
        if "first_name" in validated_data or "last_name" in validated_data:
            instance.normalized_name = Member.normalize_name(
                f"{instance.first_name} {instance.last_name}"
            )

        instance.save()
        return instance


class BulkMemberUploadSerializer(serializers.Serializer):
    """Serializer for bulk member upload from Excel with comprehensive validation."""

    file = serializers.FileField()
    chapter = serializers.PrimaryKeyRelatedField(queryset=Chapter.objects.all())

    def validate_file(self, value):
        """Validate uploaded file."""
        # Check file extension
        if not value.name.lower().endswith((".xls", ".xlsx")):
            raise serializers.ValidationError("Only .xls and .xlsx files are supported")

        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(f"File size exceeds maximum allowed size of 50MB. Your file is {value.size / (1024 * 1024):.2f}MB")

        # Check minimum file size (should be at least 1KB)
        min_size = 1024  # 1KB
        if value.size < min_size:
            raise serializers.ValidationError("File appears to be empty or corrupted. Minimum file size is 1KB")

        # Basic file type validation using magic numbers (optional but recommended)
        try:
            # Read first few bytes to verify it's actually an Excel file
            value.seek(0)
            file_header = value.read(8)
            value.seek(0)  # Reset file pointer

            # Check for Excel file signatures
            # .xlsx files start with PK (ZIP format): 50 4B 03 04
            # .xls files start with: D0 CF 11 E0 A1 B1 1A E1
            is_xlsx = file_header[:4] == b'PK\x03\x04'
            is_xls = file_header == b'\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1'

            if not (is_xlsx or is_xls):
                raise serializers.ValidationError("File does not appear to be a valid Excel file. Please upload a genuine .xls or .xlsx file")
        except Exception as e:
            # If we can't read the file, let it through but log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not validate file header: {str(e)}")

        return value


class MatrixDataSerializer(serializers.Serializer):
    """Serializer for matrix data."""

    members = serializers.ListField(child=serializers.CharField())
    matrix = serializers.ListField(child=serializers.ListField())
    totals = serializers.DictField(required=False)
    legend = serializers.DictField(required=False)


class MemberSummarySerializer(serializers.Serializer):
    """Serializer for member summary data."""

    Member = serializers.CharField()
    Referrals_Given = serializers.IntegerField()
    Referrals_Received = serializers.IntegerField()
    Unique_Referrals_Given = serializers.IntegerField()
    Unique_Referrals_Received = serializers.IntegerField()
    One_to_Ones = serializers.IntegerField()
    Unique_One_to_Ones = serializers.IntegerField()
    TYFCB_Count_Received = serializers.IntegerField()
    TYFCB_Amount_Received = serializers.DecimalField(max_digits=12, decimal_places=2)
    TYFCB_Count_Given = serializers.IntegerField()
    TYFCB_Amount_Given = serializers.DecimalField(max_digits=12, decimal_places=2)


class TYFCBSummarySerializer(serializers.Serializer):
    """Serializer for TYFCB summary data."""

    Member = serializers.CharField()
    TYFCB_Received_Count = serializers.IntegerField()
    TYFCB_Received_Amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    TYFCB_Given_Count = serializers.IntegerField()
    TYFCB_Given_Amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    Net_Amount = serializers.DecimalField(max_digits=12, decimal_places=2)


class DataQualityReportSerializer(serializers.Serializer):
    """Serializer for data quality report."""

    overall_quality_score = serializers.FloatField()
    total_records = serializers.IntegerField()
    total_issues = serializers.IntegerField()
    referrals = serializers.DictField()
    one_to_ones = serializers.DictField()
    tyfcbs = serializers.DictField()


class FileProcessingResultSerializer(serializers.Serializer):
    """Serializer for file processing results."""

    success = serializers.BooleanField()
    import_session_id = serializers.IntegerField(required=False)
    referrals_created = serializers.IntegerField()
    one_to_ones_created = serializers.IntegerField()
    tyfcbs_created = serializers.IntegerField()
    total_processed = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    error = serializers.CharField(required=False)


# Authentication Serializers


class ChapterAuthSerializer(serializers.Serializer):
    """Serializer for chapter authentication request."""

    password = serializers.CharField(write_only=True, required=True)


class AdminAuthSerializer(serializers.Serializer):
    """Serializer for admin authentication request."""

    password = serializers.CharField(write_only=True, required=True)


class UpdatePasswordSerializer(serializers.Serializer):
    """Serializer for updating password."""

    new_password = serializers.CharField(
        write_only=True, required=True, min_length=1, max_length=100
    )


class ChapterPublicSerializer(serializers.ModelSerializer):
    """Serializer for public chapter list (landing page)."""

    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Chapter
        fields = ["id", "name", "location", "member_count"]

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()


class AdminSettingsSerializer(serializers.ModelSerializer):
    """Serializer for admin settings."""

    class Meta:
        model = AdminSettings
        fields = ["admin_password", "failed_admin_attempts", "admin_lockout_until"]
        read_only_fields = ["failed_admin_attempts", "admin_lockout_until"]
