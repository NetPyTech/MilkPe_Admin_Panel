'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AdjustWalletDialog } from '@/features/money/AdjustWalletDialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatDateTime, formatInr } from '@/lib/format';
import type { UserDetail } from './schemas';
import { ExtendTrialDialog } from '@/features/controls/ExtendTrialDialog';
import { UserActions } from './UserActions';

function Fields({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm">{value || value === 0 ? value : '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="py-6 text-sm text-muted-foreground">{children}</p>;

export function UserDetailView({ data }: { data: UserDetail }) {
  const { user, profile, buyer, seller, wallet, referral } = data;
  const [adjusting, setAdjusting] = useState(false);
  const [extending, setExtending] = useState(false);
  const place = [user.district, user.state].filter(Boolean).join(', ');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{user.name || user.phone_number}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{user.phone_number}</span>
            <span>ID {user.universal_id}</span>
            {user.roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)}
            {user.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Deactivated</Badge>}
          </p>
        </div>
        <UserActions user={user} />
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          {[['profile', 'Profile'], ['dairy', 'Dairy and supplier'], ['wallet', 'Wallet'], ['network', 'Network'], ['activity', 'Activity'],
            ['notifications', 'Notifications'], ['audit', 'Audit']].map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="profile" className="pt-4">
          <Fields items={[['Name', profile?.name], ['Email', profile?.email], ['Language', user.language], ['Location', place],
            ['Address', profile?.address], ['Village', profile?.village], ['Tehsil', profile?.tehsil], ['Pincode', profile?.pincode],
            ['Joined', formatDateTime(user.date_joined)], ['Last active', formatDateTime(user.last_active)],
            ['Has signed in', user.has_logged_in ? 'Yes' : 'No (added by a dairy)']]} />
        </TabsContent>

        <TabsContent value="dairy" className="space-y-6 pt-4">
          {buyer ? (
            <Fields items={[['Dairy', buyer.dairy_name], ['Location', [buyer.district, buyer.state].filter(Boolean).join(', ')], ['Rate type', buyer.rate_type],
              ['Payment cycle', buyer.payment_cycle], ['Created', formatDateTime(buyer.created_at)], ['Suppliers', buyer.supplier_count],
              ['Collections recorded', buyer.collections_count], ['Last collection', formatDate(buyer.last_collection_date)],
              ['Free trial ends', buyer.trial_ends_at ? `${formatDate(buyer.trial_ends_at)} (${buyer.trial_days_remaining ?? 0} days left)` : null],
              ['Trial extended by', `${buyer.trial_extra_days} days`]]} />
          ) : null}
          {buyer ? (
            <>
              <Button variant="outline" onClick={() => setExtending(true)}>Extend trial</Button>
              {extending ? (
                <ExtendTrialDialog open userId={user.id} who={user.name || user.phone_number} extraDays={buyer.trial_extra_days}
                  endsAt={buyer.trial_ends_at} remaining={buyer.trial_days_remaining} onClose={() => setExtending(false)} />
              ) : null}
            </>
          ) : null}
          {seller ? (
            <Fields items={[['Business', seller.business_name], ['State', seller.state], ['Verified', seller.is_verified ? 'Yes' : 'No'],
              ['Created', formatDateTime(seller.created_at)], ['Collections as supplier', seller.collections_count]]} />
          ) : null}
          {!buyer && !seller ? <Empty>This user has not set up a dairy or a supplier profile.</Empty> : null}
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4 pt-4">
          <div className="flex items-end justify-between gap-4">
            <Fields items={[['Balance', formatInr(wallet.balance)]]} />
            <Button variant="outline" size="sm" onClick={() => setAdjusting(true)}>Adjust wallet</Button>
          </div>
          {wallet.transactions.length === 0 ? <Empty>No wallet activity yet.</Empty> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
              <TableBody>
                {wallet.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDateTime(t.created_at)}</TableCell><TableCell>{t.category}</TableCell><TableCell>{t.transaction_type}</TableCell>
                    <TableCell>{t.status}</TableCell><TableCell className="text-right tabular-nums">{formatInr(t.amount)}</TableCell><TableCell>{t.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="network" className="pt-4">
          <Fields items={[['Referral code', referral.code], ['Referred by', referral.referred_by?.phone_number], ['People referred', referral.referred_count]]} />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          {data.activity.length === 0 ? <Empty>No activity recorded yet. Activity is recorded only since this feature was deployed.</Empty> : (
            <Table>
              <TableHeader><TableRow><TableHead>Day</TableHead><TableHead>First seen</TableHead><TableHead>Last seen</TableHead><TableHead>App version</TableHead><TableHead>Platform</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.activity.map((a) => (
                  <TableRow key={a.day}>
                    <TableCell>{formatDate(a.day)}</TableCell><TableCell>{formatDateTime(a.first_seen_at)}</TableCell>
                    <TableCell>{formatDateTime(a.last_seen_at)}</TableCell><TableCell>{a.app_version || '—'}</TableCell><TableCell>{a.platform || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 pt-4">
          <h2 className="text-sm font-medium">Devices</h2>
          {data.devices.length === 0 ? <Empty>No registered devices.</Empty> : (
            <ul className="space-y-1 text-sm">{data.devices.map((d, i) => (
              <li key={i}>{d.platform} · {d.is_active ? 'active' : 'switched off'} · last seen {formatDateTime(d.last_seen)}</li>))}</ul>
          )}
          <h2 className="text-sm font-medium">Preferences</h2>
          {data.notification_settings.length === 0 ? <Empty>All notification categories are on (defaults).</Empty> : (
            <ul className="space-y-1 text-sm">{data.notification_settings.map((n) => (
              <li key={n.category}>{n.category}: in-app {n.in_app ? 'on' : 'off'}, push {n.push ? 'on' : 'off'}</li>))}</ul>
          )}
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          {data.audit.length === 0 ? <Empty>Nothing has been changed on this account from the admin panel.</Empty> : (
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.audit.map((a, i) => (
                  <TableRow key={i}><TableCell>{formatDateTime(a.created_at)}</TableCell><TableCell>{a.action}</TableCell><TableCell>{a.reason}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
      {adjusting ? <AdjustWalletDialog open user={{ id: user.id, name: user.name, phone_number: user.phone_number, balance: wallet.balance }} onClose={() => setAdjusting(false)} /> : null}
    </div>
  );
}
