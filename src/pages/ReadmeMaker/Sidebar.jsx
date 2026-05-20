import { SECTIONS, TECHS, TEMPLATES } from '../../utils/constants';
import { calculateProgress } from '../../utils/markdownUtils';

export default function Sidebar({
  sectionState, toggleSection,
  selectedTechs, toggleTech,
  applyTemplate, activeTemplate,
  formData, screenshots,
}) {
  const progress = calculateProgress({ formData, sectionState, selectedTechs, screenshots });

  const handleMissingChipClick = (id) => {
    if (!sectionState[id]) {
      toggleSection(id, true);
    }
    setTimeout(() => {
      const element = document.getElementById(`editor-section-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = element.querySelector('input, textarea');
        input?.focus();
      }
    }, 100);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section progress-section">
        <div className="sidebar-label">README Completion</div>
        <div className="progress-container">
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress.percentage}%` }}></div>
          </div>
          <div className="progress-info">
            <span className="progress-percent">{progress.percentage}%</span>
            <span className="progress-status">
              {progress.percentage === 100 && '🎉 Perfect!'}
              {progress.percentage >= 75 && progress.percentage < 100 && '🚀 Great start!'}
              {progress.percentage >= 40 && progress.percentage < 75 && '📝 Getting there...'}
              {progress.percentage < 40 && '✍️ Just starting'}
            </span>
          </div>
        </div>

        {progress.missingCore.length > 0 && (
          <div className="missing-sections-container">
            <div className="missing-title">Recommended Sections:</div>
            <div className="missing-chips">
              {progress.missingCore.map(id => {
                const labelMap = {
                  title: 'Title',
                  description: 'Description',
                  techstack: 'Tech Stack',
                  installation: 'Installation',
                  author: 'Author/License'
                };
                return (
                  <button
                    key={id}
                    className="missing-chip"
                    onClick={() => handleMissingChipClick(id)}
                    title="Click to enable and focus this section"
                  >
                    ⚠️ {labelMap[id]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Templates</div>
        <div className="templates-grid">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              className={`template-btn${activeTemplate === key ? ' selected' : ''}`}
              onClick={() => applyTemplate(t, key)}
            >
              {key === 'webapp' && '🌐 Web App'}
              {key === 'ml' && '🤖 ML / AI'}
              {key === 'api' && '⚡ Backend API'}
              {key === 'cli' && '💻 CLI Tool'}
              {key === 'academic' && '🎓 Academic / Research'}
              {key === 'mobile' && '📱 Mobile App'}
              {key === 'lib' && '📦 Library'}
              {key === 'hackathon' && '🏆 Hackathon'}
              {key === 'oss' && '🔓 Open Source'}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-label">Sections</div>
        <div className="section-toggles">
          {SECTIONS.map(sec => (
            <div
              key={sec.id}
              className={`sec-toggle${sectionState[sec.id] ? ' active' : ''}`}
            >
              <div className="sec-toggle-left">
                <span className="sec-toggle-icon">{sec.icon}</span>
                {sec.label}
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={sectionState[sec.id]}
                  onChange={e => toggleSection(sec.id, e.target.checked)}
                />
                <span className="tslider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
