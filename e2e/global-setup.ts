import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { resolveSetup } from './setupConfig';

// Seeds a LOCAL database (never the cloud one named in the backend's .env) with an administrator and a dairy owner. The Django dev server for the
// e2e run must use the same database (see README). Configurable through DJANGO_BACKEND_DIR, DJANGO_PYTHON and E2E_DATABASE_URL; the database is
// refused unless it is on this machine.
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
  const { backendDir, python, databaseUrl } = resolveSetup(process.env, path.resolve(__dirname, '..'), os.userInfo().username);
  execFileSync(python, ['manage.py', 'shell', '-c', code], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
