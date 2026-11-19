import { useMemo, useState } from 'react';
import { Pencil, RefreshCw, RotateCcw } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Collapsible from '../../components/ui/Collapsible';
import { getSections, sectionToText } from '../../../core/projectView';
import { useToast } from '../../context/ToastContext';

function SectionBody({ section }) {
  if (section.mono) {
    return <pre className="scroll-thin overflow-x-auto font-mono text-[11px] leading-relaxed text-fg">{section.text}</pre>;
  }
  if (section.text) return <p className="whitespace-pre-wrap">{section.text}</p>;
  return (
    <div className="space-y-2">
      {(section.groups || []).map((g, i) => (
        <div key={i}>
          {g.label && <p className="mb-0.5 text-[11px] font-medium text-fg">{g.label}</p>}
          <ul className="list-disc space-y-0.5 pl-4">
            {g.items.map((item, j) => (
              <li key={j} className="break-words">{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ section, project, actions }) {
  const readOnly = project.isSample;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const manual = section.source === 'manual';

  const startEdit = () => {
    setDraft(sectionToText(section));
    setEditing(true);
  };

  return (
    <Collapsible
      title={section.title}
      defaultOpen={section.id === 'overview' && !section.empty}
      meta={
        section.empty ? <Badge>Empty</Badge> : manual ? <Badge tone="accent">Edited</Badge> : section.source === 'sample' ? null : <Badge tone="info">Generated</Badge>
      }
    >
      {editing ? (
        <div className="space-y-2">
          <textarea
            className="field scroll-thin h-32 w-full resize-none py-2 text-[12px]"
            aria-label={`Edit ${section.title}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                actions.setContextNote(project.id, section.id, draft);
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <SectionBody section={section} />
          {section.note && !manual && <p className="text-[11px] italic">{section.note}</p>}
          {!readOnly && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" icon={Pencil} onClick={startEdit}>{section.empty ? 'Write' : 'Edit'}</Button>
              {manual && (
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => actions.setContextNote(project.id, section.id, null)}>
                  Use generated
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

export default function ContextTab({ project, actions }) {
  const toast = useToast();
  const sections = useMemo(() => getSections(project), [project]);
  const emptyCount = sections.filter((s) => s.empty).length;
  const readOnly = project.isSample;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[12px] text-muted">
          {readOnly ? 'Sample context.' : `${sections.length - emptyCount} of ${sections.length} sections have content. Edited sections are never overwritten.`}
        </p>
        {!readOnly && (
          <Button size="sm" icon={RefreshCw} onClick={() => actions.reanalyze(project.id) && toast.success('Context regenerated')}>
            Regenerate
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        {sections.map((s) => (
          <SectionCard key={s.id} section={s} project={project} actions={actions} />
        ))}
      </div>
    </div>
  );
}
