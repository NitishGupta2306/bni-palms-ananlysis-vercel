from analytics.models import TYFCB
from reports.models import MonthlyReport

print(f'Total TYFCB records: {TYFCB.objects.count()}')
print(f'\nSample TYFCB records:')
for t in TYFCB.objects.all()[:5]:
    receiver_name = t.receiver.full_name if t.receiver else "No receiver"
    print(f'  - {receiver_name}: AED {t.amount}, within_chapter={t.within_chapter}, date={t.date_closed}')

print(f'\n\nTotal Monthly Reports: {MonthlyReport.objects.count()}')
print(f'\nSample Monthly Reports:')
for r in MonthlyReport.objects.all()[:3]:
    print(f'  - {r.chapter.name} - {r.month_year}')
    print(f'    Inside TYFCB data: {r.tyfcb_inside_data}')
    print(f'    Outside TYFCB data: {r.tyfcb_outside_data}')
