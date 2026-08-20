import { PortalLayout, PageHeader } from '../../components/PortalLayout';
import { HotLeadBadge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { pipelineStages } from '../../data/mock';

const agentNav = [
  { to: '/agent', label: 'Dashboard', end: true },
  { to: '/agent/leads', label: 'Leads' },
  { to: '/agent/pipeline', label: 'Pipeline' },
  { to: '/agent/listings/new', label: 'Tạo listing' },
  { to: '/agent/bookings/new', label: 'Booking' },
];

export default function Pipeline() {
  return (
    <PortalLayout portal="agent" title="Agent Portal" nav={agentNav} userMenu="Hoàng Nam ▾">
      <PageHeader title="Pipeline CRM" description="FR-CRM-05 · Kanban theo stage" />

      <div className="p-4 sm:p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {pipelineStages.map((stage) => (
            <div key={stage.code} className="w-56 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{stage.label}</h3>
                <span className="text-xs bg-secondary px-2 py-0.5 rounded">{stage.count}</span>
              </div>
              <div className="space-y-2">
                {stage.leads.map((name, i) => (
                  <Card key={name} className="cursor-grab hover:shadow-md transition-shadow">
                    <CardBody className="p-3">
                      <p className="font-medium text-sm">{name}</p>
                      {i === 0 && stage.code === 'NEW' && (
                        <div className="mt-2"><HotLeadBadge score={85} /></div>
                      )}
                      {i === 0 && stage.code === 'BOOKING' && (
                        <p className="text-xs text-muted mt-1">Score 90</p>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
