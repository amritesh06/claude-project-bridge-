import { FlaskConical } from 'lucide-react';
import Badge from './Badge';

// Shown on every record that comes from src/popup/data/sample.js.
export default function SampleBadge() {
  return (
    <Badge tone="info" icon={FlaskConical}>
      Sample
    </Badge>
  );
}
