import { execFileSync } from 'node:child_process';

// Seeds the LOCAL database (never the cloud one named in the backend's .env) with an administrator and a dairy owner. The Django dev
// server for the e2e run must use the same local database (see README).
export default async function globalSetup() {
  const code = `
from django.contrib.auth import get_user_model
from buyer.models import BuyerProfile
from user.models import UserInformation
U = get_user_model()
admin, _ = U.all_objects.get_or_create(phone_number='+919999900077', defaults={'is_superuser': True, 'is_staff': True, 'has_logged_in': True})
admin.is_superuser = admin.is_staff = admin.is_active = True
admin.set_password('e2e-Password-1')
admin.save()
UserInformation.objects.update_or_create(user=admin, defaults={'name': 'E2E Admin', 'email': 'e2e-admin@example.com'})
owner, _ = U.all_objects.get_or_create(phone_number='+919999900078', defaults={'has_logged_in': True})
owner.is_active = True
owner.save()
UserInformation.objects.update_or_create(user=owner, defaults={'name': 'E2E Dairy Owner'})
BuyerProfile.objects.get_or_create(user=owner, defaults={'dairy_name': 'E2E Dairy'})
`;
  execFileSync(process.env.DJANGO_PYTHON ?? '/home/elt/Milkpe/MilkPe_Backend/.venv/bin/python', ['manage.py', 'shell', '-c', code], {
    cwd: '/home/elt/Milkpe/MilkPe_Backend',
    env: { ...process.env, DATABASE_URL: 'postgresql://elt@/milkpe_local?host=/var/run/postgresql' },
    stdio: 'inherit',
  });
}
