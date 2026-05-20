import { convertStructure } from './structureUtils.js';

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const BADGE_COLORS = {
  brightgreen: '#22c55e', green: '#22c55e', yellowgreen: '#84cc16',
  yellow: '#eab308', orange: '#f97316', red: '#ef4444',
  blue: '#3b82f6', lightgrey: '#94a3b8', grey: '#64748b',
  gray: '#64748b', blueviolet: '#8b5cf6', ff69b4: '#ec4899',
};

export function shieldToBadge(label, url) {
  const isShield = url.indexOf('shields.io') !== -1;
  if (!isShield)
    return `<span class="gh-badge" style="background:#555;color:#fff">${label}</span>`;

  let color = '#555', left = label || '', right = '', m;
  m = url.match(/\/badge\/([^?]+)/);
  if (m) {
    const parts = m[1].split('-');
    if (parts.length >= 3) {
      right = parts[parts.length - 2];
      const col = parts[parts.length - 1].split('?')[0];
      color = BADGE_COLORS[col] || '#' + col;
      left = parts.slice(0, parts.length - 2).join(' ').replace(/_/g, ' ');
    } else if (parts.length === 2) {
      right = parts[1].split('?')[0];
      color = '#22c55e';
      left = parts[0].replace(/_/g, ' ');
    } else {
      left = parts[0].replace(/_/g, ' ');
      color = '#3b82f6';
    }
  }
  if (!m) {
    if (url.indexOf('/github/stars') !== -1) { left = 'Stars'; right = '★'; color = '#f59e0b'; }
    else if (url.indexOf('/github/forks') !== -1) { left = 'Forks'; right = '⑂'; color = '#8b5cf6'; }
    else if (url.indexOf('/github/issues') !== -1) { left = 'Issues'; right = '●'; color = '#ef4444'; }
    else { left = label; color = '#3b82f6'; }
  }
  left = decodeURIComponent(left).replace(/\+/g, ' ');
  right = decodeURIComponent(right).replace(/\+/g, ' ');
  return `<span class="gh-badge"><span class="gh-badge-left">${left}</span>${right ? `<span class="gh-badge-right" style="background:${color}">${right}</span>` : ''}</span>`;
}

export function md2html(md) {
  let h = md;
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) => `<pre><code>${esc(code)}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/__(.+?)__/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/^---$/gm, '<hr>');
  h = h.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, alt, imgUrl, linkUrl) =>
    `<a href="${linkUrl}" target="_blank" style="text-decoration:none">${shieldToBadge(alt, imgUrl)}</a>`
  );
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imgUrl) => {
    if (imgUrl.indexOf('shields.io') !== -1) return shieldToBadge(alt, imgUrl);
    return `<img src="${imgUrl}" alt="${alt}" style="max-width:100%;border-radius:4px;margin:4px 0">`;
  });
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  h = h.replace(/((\|.+\|\n)+)/g, (table) => {
    const rows = table.trim().split('\n');
    let out = '<table>';
    rows.forEach((row, i) => {
      if (row.match(/^\|[-| :]+\|$/)) return;
      const cells = row.split('|').filter((c, idx, a) => idx > 0 && idx < a.length - 1);
      const tag = i === 0 ? 'th' : 'td';
      out += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });
    return out + '</table>';
  });
  h = h.replace(/^- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[\s\S]*?<\/li>)/g, m => `<ul>${m}</ul>`);
  h = h.split('\n\n').map(block => {
    if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|table)/.test(block.trim())) return block;
    return `<p>${block.replace(/\n/g, ' ')}</p>`;
  }).join('\n');
  return h;
}

export function generateMarkdown({ formData, sectionState, selectedTechs, selectedBadges, screenshots, sectionOrder }) {
  const {
    projName, tagline, ghUser: ghUserRaw, repoSlug: repoSlugRaw,
    description, demoUrl, features, prereqs, installCmds, envVars,
    usageCmd, rawStructure, videoUrl, imageUrls, apiDocs, apiBase,
    contribNotes, license, authorName, authorGh, authorEmail,
    authorLinkedin, authorWebsite, customTech, supportMsg,
    supportBmac, supportKofi, supportPatreon, supportGhSponsors,
    abstractText, paperLink, datasetLink, methodology, bibtexCitation,
  } = formData;

  const name = projName || 'My Project';
  const ghUser = ghUserRaw || authorGh || 'username';
  const repoSlug = repoSlugRaw || name.toLowerCase().replace(/\s+/g, '-');
  const on = (id) => sectionState[id];
  const order = sectionOrder || [
    'title', 'description', 'academic', 'features', 'techstack',
    'installation', 'structure', 'screenshots', 'api', 'contributing',
    'author', 'support'
  ];
  let md = '';

  const generators = {
    title: () => {
      let chunk = `# ${name}\n\n`;
      if (tagline) chunk += `> **${tagline}**\n\n`;
      const badges = [];
      if (selectedBadges.has('license') && license !== 'none')
        badges.push(`[![License](https://img.shields.io/badge/license-${encodeURIComponent(license)}-green.svg)](LICENSE)`);
      if (selectedBadges.has('stars'))
        badges.push(`[![Stars](https://img.shields.io/github/stars/${ghUser}/${repoSlug}?style=social)](https://github.com/${ghUser}/${repoSlug})`);
      if (selectedBadges.has('forks'))
        badges.push(`[![Forks](https://img.shields.io/github/forks/${ghUser}/${repoSlug}?style=social)](https://github.com/${ghUser}/${repoSlug}/fork)`);
      if (selectedBadges.has('issues'))
        badges.push(`[![Issues](https://img.shields.io/github/issues/${ghUser}/${repoSlug})](https://github.com/${ghUser}/${repoSlug}/issues)`);
      if (selectedBadges.has('prs'))
        badges.push(`[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/${ghUser}/${repoSlug}/pulls)`);
      if (selectedBadges.has('build'))
        badges.push(`![Build](https://img.shields.io/badge/build-passing-brightgreen)`);
      if (selectedBadges.has('coverage'))
        badges.push(`![Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)`);
      if (selectedBadges.has('version'))
        badges.push(`![Version](https://img.shields.io/badge/version-1.0.0-blue)`);
      if (badges.length) chunk += badges.join(' ') + '\n\n';

      chunk += '---\n\n';
      chunk += '## 📋 Table of Contents\n\n';
      order.forEach(secId => {
        if (secId === 'title') return;
        if (on(secId)) {
          if (secId === 'description') chunk += '- [Description](#-description)\n';
          else if (secId === 'academic') chunk += '- [Academic / Research Details](#academic--research-details)\n';
          else if (secId === 'features') chunk += '- [Features](#-features)\n';
          else if (secId === 'techstack') chunk += '- [Tech Stack](#-tech-stack)\n';
          else if (secId === 'installation') chunk += '- [Installation](#-installation)\n';
          else if (secId === 'structure') chunk += '- [Project Structure](#-project-structure)\n';
          else if (secId === 'screenshots') chunk += '- [Screenshots](#-screenshots)\n';
          else if (secId === 'api') chunk += '- [API Reference](#-api-reference)\n';
          else if (secId === 'contributing') chunk += '- [Contributing](#-contributing)\n';
          else if (secId === 'author') chunk += '- [License](#-license)\n- [Author](#-author)\n';
          else if (secId === 'support') chunk += '- [Support & Donation](#️-support--donation)\n';
        }
      });
      chunk += '\n---\n\n';
      return chunk;
    },
    description: () => {
      let chunk = '## 📌 Description\n\n';
      chunk += (description || '_Add a description of your project here._') + '\n\n';
      if (demoUrl) chunk += `🔗 **Live Demo:** [${demoUrl}](${demoUrl})\n\n`;
      chunk += '---\n\n';
      return chunk;
    },
    academic: () => {
      const hasAcademicContent = abstractText || paperLink || datasetLink || methodology || bibtexCitation;
      if (!hasAcademicContent) return '';
      let chunk = '## Academic / Research Details\n\n';
      const academicBadges = [];
      if (paperLink) academicBadges.push(`[![Paper](https://img.shields.io/badge/Paper-Read%20Now-blue)](${paperLink})`);
      if (datasetLink) academicBadges.push(`[![Dataset](https://img.shields.io/badge/Dataset-Access-green)](${datasetLink})`);
      if (academicBadges.length) chunk += academicBadges.join(' ') + '\n\n';
      if (abstractText) chunk += `### Abstract\n\n${abstractText}\n\n`;
      if (paperLink) chunk += `### Paper Link\n\n[${paperLink}](${paperLink})\n\n`;
      if (datasetLink) chunk += `### Dataset Access\n\n[${datasetLink}](${datasetLink})\n\n`;
      if (methodology) {
        chunk += '### Methodology\n\n';
        methodology.split('\n').forEach(line => {
          const l = line.trimEnd();
          if (l.trim().startsWith('###')) chunk += '\n' + l.trim() + '\n';
          else if (l.trim()) chunk += (l.trim().startsWith('-') ? l : '- ' + l.trim()) + '\n';
        });
        chunk += '\n';
      }
      if (bibtexCitation) chunk += `### Citation\n\n\`\`\`bibtex\n${bibtexCitation}\n\`\`\`\n\n`;
      chunk += '---\n\n';
      return chunk;
    },
    features: () => {
      if (!features) return '';
      let chunk = '## ✨ Features\n\n';
      features.split('\n').forEach(line => {
        const l = line.trimEnd();
        if (l.trim().startsWith('###')) chunk += '\n' + l.trim() + '\n';
        else if (l.trim()) chunk += (l.trim().startsWith('-') ? l : '- ' + l.trim()) + '\n';
      });
      chunk += '\n---\n\n';
      return chunk;
    },
    techstack: () => {
      const allTech = Array.from(selectedTechs);
      if (customTech) customTech.split(',').forEach(t => { const tr = t.trim(); if (tr) allTech.push(tr); });
      if (!allTech.length) return '';
      let chunk = '## 🛠️ Tech Stack\n\n| Layer | Technology |\n|---|---|\n';
      const front = allTech.filter(t => ['React','Vue','Next.js','TypeScript','JavaScript','Tailwind','HTML','CSS'].includes(t));
      const back = allTech.filter(t => ['Node.js','Express','Django','FastAPI','Flask','Spring','Go','Python','Rust','Java','C++'].includes(t));
      const db = allTech.filter(t => ['PostgreSQL','MySQL','MongoDB','SQLite','Redis'].includes(t));
      const infra = allTech.filter(t => ['Docker','Kubernetes','AWS','GCP','Azure','Nginx','Linux'].includes(t));
      const ml = allTech.filter(t => ['TensorFlow','PyTorch','GraphQL'].includes(t));
      const rest = allTech.filter(t => ![...front,...back,...db,...infra,...ml].includes(t));
      if (front.length) chunk += `| Frontend | ${front.join(', ')} |\n`;
      if (back.length) chunk += `| Backend  | ${back.join(', ')} |\n`;
      if (db.length) chunk += `| Database | ${db.join(', ')} |\n`;
      if (ml.length) chunk += `| AI / ML  | ${ml.join(', ')} |\n`;
      if (infra.length) chunk += `| DevOps   | ${infra.join(', ')} |\n`;
      if (rest.length) chunk += `| Other    | ${rest.join(', ')} |\n`;
      chunk += '\n---\n\n';
      return chunk;
    },
    installation: () => {
      let chunk = '## 🚀 Installation\n\n';
      if (prereqs) chunk += `**Prerequisites:** ${prereqs}\n\n`;
      if (installCmds) {
        chunk += '```bash\n' + installCmds + '\n```\n\n';
      } else {
        chunk += `\`\`\`bash\ngit clone https://github.com/${ghUser}/${repoSlug}.git\ncd ${repoSlug}\n\`\`\`\n\n`;
      }
      if (envVars) chunk += '**Environment Variables** — create a `.env` file:\n\n```env\n' + envVars + '\n```\n\n';
      if (usageCmd) chunk += '## 💻 Usage\n\n```bash\n' + usageCmd + '\n```\n\n';
      chunk += '---\n\n';
      return chunk;
    },
    structure: () => {
      if (!rawStructure.trim()) return '';
      return '## 📁 Project Structure\n\n```\n' + convertStructure(rawStructure, name) + '\n```\n\n---\n\n';
    },
    screenshots: () => {
      const hasContent = videoUrl || screenshots.length || imageUrls.trim();
      if (!hasContent) return '';
      let chunk = '## 🖼️ Screenshots\n\n';
      if (videoUrl) chunk += `▶️ **Demo Video:** [Watch Here](${videoUrl})\n\n`;
      screenshots.forEach(ss => {
        const label = ss.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        chunk += `### ${label}\n\n![${label}](${ss.dataUrl})\n\n`;
      });
      if (imageUrls.trim()) {
        imageUrls.split('\n').filter(l => l.trim()).forEach(line => {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length >= 2) chunk += `### ${parts[0]}\n\n![${parts[0]}](${parts[1]})\n\n`;
          else if (parts[0]) chunk += `![Screenshot](${parts[0]})\n\n`;
        });
      }
      chunk += '---\n\n';
      return chunk;
    },
    api: () => {
      if (!apiDocs.trim()) return '';
      let chunk = '## ⚡ API Reference\n\n';
      if (apiBase) chunk += `**Base URL:** \`${apiBase}\`\n\n`;
      chunk += '| Method | Endpoint | Description |\n|--------|----------|-------------|\n';
      apiDocs.split('\n').filter(l => l.trim()).forEach(line => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2) {
          const ep = parts[0].split(' ');
          chunk += `| \`${ep[0]}\` | \`${ep.slice(1).join(' ')}\` | ${parts[1]} |\n`;
        }
      });
      chunk += '\n---\n\n';
      return chunk;
    },
    contributing: () => {
      let chunk = '## 🤝 Contributing\n\nContributions are always welcome!\n\n';
      chunk += '1. Fork the repository\n';
      chunk += '2. Create your branch: `git checkout -b feature/amazing-feature`\n';
      chunk += '3. Commit your changes: `git commit -m "Add amazing feature"`\n';
      chunk += '4. Push to the branch: `git push origin feature/amazing-feature`\n';
      chunk += '5. Open a Pull Request\n\n';
      if (contribNotes) chunk += contribNotes + '\n\n';
      chunk += '---\n\n';
      return chunk;
    },
    author: () => {
      let chunk = '';
      if (license !== 'none')
        chunk += `## 📄 License\n\nThis project is licensed under the **[${license} License](LICENSE)**.\n\n---\n\n`;
      chunk += '## 👤 Author\n\n';
      const displayName = authorName || authorGh || ghUser;
      chunk += `**${displayName}**\n\n`;
      if (authorGh) chunk += `- 🐙 GitHub: [@${authorGh}](https://github.com/${authorGh})\n`;
      if (authorEmail) chunk += `- 📧 Email: [${authorEmail}](mailto:${authorEmail})\n`;
      if (authorLinkedin) chunk += `- 💼 LinkedIn: [${displayName}](${authorLinkedin})\n`;
      if (authorWebsite) chunk += `- 🌐 Website: [${authorWebsite}](${authorWebsite})\n`;
      chunk += '\n---\n\n';
      chunk += `> Made with ❤️ by [${displayName}](https://github.com/${authorGh || ghUser})\n`;
      return chunk;
    },
    support: () => {
      const hasSupportUrls = supportBmac || supportKofi || supportPatreon || supportGhSponsors;
      if (!supportMsg && !hasSupportUrls) return '';
      let chunk = '## ❤️ Support & Donation\n\n';
      if (supportMsg) {
        chunk += supportMsg + '\n\n';
      } else {
        chunk += 'If you find this project helpful, please consider supporting its development:\n\n';
      }
      const supportLinks = [];
      if (supportBmac) supportLinks.push(`[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/${supportBmac})`);
      if (supportKofi) supportLinks.push(`[![Ko-fi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/${supportKofi})`);
      if (supportPatreon) supportLinks.push(`[![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/${supportPatreon})`);
      if (supportGhSponsors) supportLinks.push(`[![GitHub Sponsors](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/${supportGhSponsors})`);
      if (supportLinks.length) chunk += supportLinks.join(' ') + '\n\n';
      chunk += '---\n\n';
      return chunk;
    }
  };

  order.forEach(secId => {
    if (on(secId) && generators[secId]) {
      md += generators[secId]();
    }
  });

  return md;
}

export function getWordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w && w !== '###' && w !== '-').length;
}

export function calculateProgress({ formData, sectionState, selectedTechs, screenshots }) {
  const isFilled = (id) => {
    if (!sectionState[id]) return false;
    switch (id) {
      case 'title':
        return !!formData.projName?.trim();
      case 'description':
        return !!formData.description?.trim();
      case 'features':
        return !!formData.features?.trim();
      case 'techstack':
        return selectedTechs?.size > 0 || !!formData.customTech?.trim();
      case 'installation':
        return !!formData.installCmds?.trim() || !!formData.usageCmd?.trim();
      case 'structure':
        return !!formData.rawStructure?.trim();
      case 'screenshots':
        return (screenshots && screenshots.length > 0) || !!formData.imageUrls?.trim() || !!formData.videoUrl?.trim();
      case 'api':
        return !!formData.apiDocs?.trim();
      case 'contributing':
        return true;
      case 'author':
        return !!formData.authorName?.trim() || !!formData.authorGh?.trim();
      case 'support':
        return !!formData.supportMsg?.trim() || !!formData.supportBmac?.trim() || !!formData.supportKofi?.trim() || !!formData.supportPatreon?.trim() || !!formData.supportGhSponsors?.trim();
      case 'academic':
        return !!formData.abstractText?.trim() || !!formData.paperLink?.trim();
      default:
        return false;
    }
  };

  const coreSections = ['title', 'description', 'techstack', 'installation', 'author'];
  const optionalSections = ['features', 'structure', 'screenshots', 'api', 'contributing', 'academic', 'support'];

  let coreScore = 0;
  coreSections.forEach(id => {
    if (isFilled(id)) coreScore += 15;
  });

  let optionalScore = 0;
  optionalSections.forEach(id => {
    if (isFilled(id)) optionalScore += 5;
  });
  optionalScore = Math.min(25, optionalScore);

  const totalProgress = coreScore + optionalScore;
  const missingCore = coreSections.filter(id => !isFilled(id));

  return {
    percentage: totalProgress,
    missingCore,
  };
}
