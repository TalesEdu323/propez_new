import { GoogleCalendarPanel } from '../components/calendar/GoogleCalendarPanel';
import type { NavigateFn } from '../types/navigation';

export default function Agenda({ navigate: _navigate }: { navigate: NavigateFn }) {
  return (
    <div className="p-6 md:p-10 min-h-full">
      <GoogleCalendarPanel />
    </div>
  );
}
