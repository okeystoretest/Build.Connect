import { sanitizeAttribute, sanitizeText } from '../../utils/sanitize.js';

const WELCOME_VIDEO = Object.freeze({
  title: 'Vídeo institucional Build.Connect',
  embedUrl: 'https://www.youtube.com/embed/kvxXe6evgDM',
});

export function getWelcomeViewMarkup(authenticatedUser) {
  const greeting = getWelcomeGreeting(authenticatedUser);

  return `
    <section class="content-panel" aria-labelledby="content-title" data-view-panel>
      <div class="welcome-header reveal-item" data-reveal>
        <p class="eyebrow">Seja bem-vindo(a)!</p>
        <h1 id="content-title">${sanitizeText(greeting.title)}</h1>
        <p class="content-description">${sanitizeText(greeting.description)}</p>
      </div>

      <section class="welcome-showcase reveal-item" data-reveal aria-label="Painel principal de boas-vindas">
        <article class="welcome-video-card">
          <div class="welcome-video-frame">
            <iframe
              src="${sanitizeAttribute(WELCOME_VIDEO.embedUrl)}"
              title="${sanitizeAttribute(WELCOME_VIDEO.title)}"
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>
        </article>

        <article class="welcome-copy-card">
          <p class="eyebrow">Hub de integração</p>
          <h2 class="welcome-section-title">Bem-vindo(a) ao Build.Connect</h2>
          <div class="welcome-copy-flow">
            <p>Este portal centraliza todos os materiais de integração (documentos, vídeos e manuais) para apoiar sua jornada na empresa e facilitar o entendimento dos nossos processos. Use o menu lateral para navegar entre os setores e retorne a este painel inicial para ter uma visão geral.</p>
            
          </div>
        </article>
      </section>
    </section>
  `;
}

function getWelcomeGreeting(authenticatedUser) {
  const normalizedName = String(authenticatedUser?.nome || '').trim();

  if (!normalizedName) {
    return {
      title: 'Bem-vindo ao Build.Connect',
      description: 'Acompanhe os conteúdos de integração e acesse as informações principais de cada setor em um único lugar.',
    };
  }

  const firstName = normalizedName.split(/\s+/)[0];
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return {
    title: `${period}, ${firstName}.`,
    description: 'Sua central de integração está pronta para guiar você pelos nossos setores e conteúdos.',
  };
}
