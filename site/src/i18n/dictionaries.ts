export type Dict = {
  langName: string;
  langCode: string;
  nav: { how: string; limits: string; github: string };
  hero: {
    badge: string;
    h1a: string;
    h1b: string;
    p: string;
    then: string;
    tabs: { cmd: string; ps: string; sh: string };
    copied: string;
    flow: { name: string; note: string }[];
  };
  features: {
    title: string;
    intro: string;
    items: { title: string; body: string }[];
  };
  models: {
    title: string;
    introA: string;
    introB: string;
    introC: string;
    chipsLabel: string;
  };
  limits: {
    title: string;
    intro: string;
    rows: [string, string][];
    fullA: string;
    fullB: string;
  };
  footer: { readme: string; mit: string; contributing: string; source: string; disclaimer: string };
  menu: { label: string; choose: string };
};

export const en: Dict = {
  langName: 'English',
  langCode: 'EN',
  nav: { how: 'how it works', limits: 'limits', github: 'GitHub' },
  hero: {
    badge: 'open source · MIT · zero runtime dependencies',
    h1a: 'The terminal stays.',
    h1b: 'The model changes.',
    p: 'qoder-claude is a local Anthropic Messages API bridge backed by your Qoder plan. Claude Code keeps its tools, its prompts and its effort controls; the tokens come from Qoder.',
    then: 'then open it with',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copied',
    flow: [
      { name: 'Claude Code', note: 'tools, prompt, effort' },
      { name: 'qoder-bridge', note: 'stateless HTTP + SSE' },
      { name: 'qoder WASM', note: 'local signing' },
      { name: 'api1.qoder.sh', note: 'signed request' },
    ],
  },
  features: {
    title: 'What does not move',
    intro:
      'Only the model behind the curtain changes. Everything you interact with — commands, tools, permissions, config — stays exactly where it was.',
    items: [
      {
        title: 'Tool calls',
        body: 'Claude Code still receives tool_use blocks. The bridge asks the model for a call in text and converts it before it reaches the client, so Read, Write, Edit, Bash and Agent behave the same.',
      },
      {
        title: 'Credentials',
        body: 'The Qoder token stays in your config directory. The bridge reads it locally, signs each request with the embedded Qoder WASM, and never forwards it to any other host.',
      },
      {
        title: 'Your controls',
        body: 'Model picker, effort slider, thinking budget, statusline. The values you set in Claude Code arrive at the model unchanged, because the bridge forwards them.',
      },
      {
        title: 'Account failover',
        body: 'Add as many Qoder accounts as you want. When one hits its daily quota, gets rate-limited or loses its session, the bridge pauses it and retries the same request on the next account — no restart, no manual switch.',
      },
    ],
  },
  models: {
    title: 'Model list, not a guess',
    introA: 'The bridge asks',
    introB: 'on a ten-minute cache. A new model on your plan shows up in',
    introC: 'without a release.',
    chipsLabel: 'Available models',
  },
  limits: {
    title: 'Where it hurts',
    intro:
      'The honest list. If any of these breaks your workflow, the bridge is not the right tool — and it is better to know before installing.',
    rows: [
      ['Latency', '~2s with a warm worker, 10–15s while the pool refills'],
      ['Context', 'the full history is serialized into every request'],
      ['Transport', 'direct by default — the embedded WASM signs the request; the CLI stays as fallback'],
      ['Tools', 'negotiated in text, converted to tool_use by the bridge'],
    ],
    fullA: 'Full detail, including the reason the API cannot be called directly, lives in the',
    fullB: 'repository',
  },
  footer: {
    readme: 'README',
    mit: 'MIT',
    contributing: 'Contributing',
    source: 'Source',
    disclaimer:
      'Not affiliated with Anthropic or Qoder. Claude Code and Claude are trademarks of Anthropic; Qoder is a product of its respective owner. This project is an interoperability bridge. Use it within the terms of the accounts you own.',
  },
  menu: { label: 'Language', choose: 'Choose language' },
};

export const pt: Dict = {
  langName: 'Português (BR)',
  langCode: 'PT',
  nav: { how: 'como funciona', limits: 'limites', github: 'GitHub' },
  hero: {
    badge: 'código aberto · MIT · zero dependências de runtime',
    h1a: 'O terminal fica.',
    h1b: 'O modelo muda.',
    p: 'qoder-claude é uma bridge local da Anthropic Messages API apoiada no seu plano Qoder. O Claude Code mantém as ferramentas, os prompts e os controles de esforço; os tokens vêm do Qoder.',
    then: 'depois abra com',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copiado',
    flow: [
      { name: 'Claude Code', note: 'ferramentas, prompt, esforço' },
      { name: 'qoder-bridge', note: 'HTTP + SSE sem estado' },
      { name: 'qoder WASM', note: 'assinatura local' },
      { name: 'api1.qoder.sh', note: 'request assinado' },
    ],
  },
  features: {
    title: 'O que não se move',
    intro:
      'Só o modelo atrás da cortina muda. Tudo com que você interage — comandos, ferramentas, permissões, configuração — fica exatamente onde estava.',
    items: [
      {
        title: 'Chamadas de ferramenta',
        body: 'O Claude Code continua recebendo blocos tool_use. A bridge pede a chamada ao modelo em texto e converte antes de entregar ao cliente, então Read, Write, Edit, Bash e Agent se comportam igual.',
      },
      {
        title: 'Credenciais',
        body: 'O token do Qoder fica no seu diretório de configuração. A bridge lê localmente, assina cada requisição com o WASM embutido do Qoder e não encaminha o token para nenhum outro host.',
      },
      {
        title: 'Seus controles',
        body: 'Seletor de modelo, força de raciocínio, orçamento de pensamento, statusline. O que você define no Claude Code chega ao modelo intacto, porque a bridge repassa.',
      },
      {
        title: 'Failover de contas',
        body: 'Adicione quantas contas Qoder quiser. Quando uma bate a cota diária, leva rate limit ou perde a sessão, a bridge pausa essa conta e repete a mesma requisição na próxima — sem reiniciar, sem trocar na mão.',
      },
    ],
  },
  models: {
    title: 'Lista de modelos, não um chute',
    introA: 'A bridge consulta',
    introB: 'num cache de dez minutos. Modelo novo no seu plano aparece em',
    introC: 'sem precisar de release.',
    chipsLabel: 'Modelos disponíveis',
  },
  limits: {
    title: 'Onde dói',
    intro:
      'A lista honesta. Se algum destes pontos quebra o seu fluxo, a bridge não é a ferramenta certa — e é melhor saber antes de instalar.',
    rows: [
      ['Latência', '~2s com worker quente, 10–15s enquanto o pool repõe'],
      ['Contexto', 'o histórico inteiro é serializado em cada requisição'],
      ['Transporte', 'direto por padrão — o WASM embutido assina a requisição; o CLI fica como fallback'],
      ['Ferramentas', 'negociadas em texto, convertidas em tool_use pela bridge'],
    ],
    fullA: 'O detalhe completo, incluindo o motivo de a API não poder ser chamada direto, está no',
    fullB: 'repositório',
  },
  footer: {
    readme: 'README',
    mit: 'MIT',
    contributing: 'Contribuir',
    source: 'Código',
    disclaimer:
      'Sem vínculo com a Anthropic ou com a Qoder. Claude Code e Claude são marcas da Anthropic; Qoder é produto do respectivo dono. Este projeto é uma ponte de interoperabilidade. Use dentro dos termos das contas que você possui.',
  },
  menu: { label: 'Idioma', choose: 'Escolher idioma' },
};

export const es: Dict = {
  langName: 'Español',
  langCode: 'ES',
  nav: { how: 'cómo funciona', limits: 'límites', github: 'GitHub' },
  hero: {
    badge: 'código abierto · MIT · sin dependencias de ejecución',
    h1a: 'La terminal se queda.',
    h1b: 'El modelo cambia.',
    p: 'qoder-claude es un puente local de Anthropic Messages API apoyado en tu plan de Qoder. Claude Code conserva sus herramientas, sus prompts y sus controles de esfuerzo; los tokens vienen de Qoder.',
    then: 'luego ábrelo con',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copiado',
    flow: [
      { name: 'Claude Code', note: 'herramientas, prompt, esfuerzo' },
      { name: 'qoder-bridge', note: 'HTTP + SSE sin estado' },
      { name: 'qoder WASM', note: 'firma local' },
      { name: 'api1.qoder.sh', note: 'petición firmada' },
    ],
  },
  features: {
    title: 'Lo que no se mueve',
    intro:
      'Solo cambia el modelo detrás de la cortina. Todo con lo que interactúas — comandos, herramientas, permisos, configuración — queda exactamente donde estaba.',
    items: [
      {
        title: 'Llamadas a herramientas',
        body: 'Claude Code sigue recibiendo bloques tool_use. El puente pide la llamada al modelo en texto y la convierte antes de entregarla al cliente, así que Read, Write, Edit, Bash y Agent se comportan igual.',
      },
      {
        title: 'Credenciales',
        body: 'El token de Qoder se queda en tu directorio de configuración. El puente lo lee en local, firma cada petición con el WASM de Qoder embebido y no lo reenvía a ningún otro host.',
      },
      {
        title: 'Tus controles',
        body: 'Selector de modelo, nivel de esfuerzo, presupuesto de pensamiento, statusline. Lo que defines en Claude Code llega al modelo sin cambios, porque el puente lo reenvía.',
      },
      {
        title: 'Failover de cuentas',
        body: 'Añade tantas cuentas de Qoder como quieras. Cuando una agota la cuota diaria, recibe un rate limit o pierde la sesión, el puente la pausa y repite la misma petición en la siguiente — sin reiniciar, sin cambiar a mano.',
      },
    ],
  },
  models: {
    title: 'Lista de modelos, no una suposición',
    introA: 'El puente consulta',
    introB: 'con una caché de diez minutos. Un modelo nuevo en tu plan aparece en',
    introC: 'sin necesidad de un release.',
    chipsLabel: 'Modelos disponibles',
  },
  limits: {
    title: 'Dónde duele',
    intro:
      'La lista honesta. Si alguno de estos puntos rompe tu flujo, el puente no es la herramienta adecuada — y es mejor saberlo antes de instalar.',
    rows: [
      ['Latencia', '~2s con worker caliente, 10–15s mientras el pool se repone'],
      ['Contexto', 'el historial completo se serializa en cada petición'],
      ['Transporte', 'directo por defecto — el WASM embebido firma la petición; el CLI queda como fallback'],
      ['Herramientas', 'negociadas en texto, convertidas a tool_use por el puente'],
    ],
    fullA: 'El detalle completo, incluido el motivo por el que la API no se puede llamar directamente, está en el',
    fullB: 'repositorio',
  },
  footer: {
    readme: 'README',
    mit: 'MIT',
    contributing: 'Contribuir',
    source: 'Código',
    disclaimer:
      'Sin vínculo con Anthropic ni con Qoder. Claude Code y Claude son marcas de Anthropic; Qoder es producto de su respectivo dueño. Este proyecto es un puente de interoperabilidad. Úsalo dentro de los términos de las cuentas que posees.',
  },
  menu: { label: 'Idioma', choose: 'Elegir idioma' },
};

export const fr: Dict = {
  langName: 'Français',
  langCode: 'FR',
  nav: { how: 'fonctionnement', limits: 'limites', github: 'GitHub' },
  hero: {
    badge: 'open source · MIT · aucune dépendance à l’exécution',
    h1a: 'Le terminal reste.',
    h1b: 'Le modèle change.',
    p: 'qoder-claude est un pont local Anthropic Messages API adossé à votre offre Qoder. Claude Code garde ses outils, ses prompts et ses réglages d’effort ; les jetons viennent de Qoder.',
    then: 'puis ouvrez-le avec',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copié',
    flow: [
      { name: 'Claude Code', note: 'outils, prompt, effort' },
      { name: 'qoder-bridge', note: 'HTTP + SSE sans état' },
      { name: 'qoder WASM', note: 'signature locale' },
      { name: 'api1.qoder.sh', note: 'requête signée' },
    ],
  },
  features: {
    title: 'Ce qui ne bouge pas',
    intro:
      'Seul le modèle derrière le rideau change. Tout ce avec quoi vous interagissez — commandes, outils, permissions, configuration — reste exactement où il était.',
    items: [
      {
        title: 'Appels d’outils',
        body: 'Claude Code reçoit toujours des blocs tool_use. Le pont demande l’appel au modèle en texte et le convertit avant de le remettre au client, donc Read, Write, Edit, Bash et Agent se comportent pareil.',
      },
      {
        title: 'Identifiants',
        body: 'Le jeton Qoder reste dans votre dossier de configuration. Le pont le lit en local, signe chaque requête avec le WASM Qoder embarqué et ne le transmet à aucun autre hôte.',
      },
      {
        title: 'Vos réglages',
        body: 'Sélecteur de modèle, niveau d’effort, budget de réflexion, statusline. Ce que vous réglez dans Claude Code arrive au modèle intact, parce que le pont le transmet.',
      },
      {
        title: 'Bascule de comptes',
        body: 'Ajoutez autant de comptes Qoder que vous voulez. Quand l’un atteint son quota quotidien, prend un rate limit ou perd sa session, le pont le met en pause et rejoue la même requête sur le suivant — sans redémarrage, sans bascule manuelle.',
      },
    ],
  },
  models: {
    title: 'Une liste de modèles, pas une supposition',
    introA: 'Le pont interroge',
    introB: 'avec un cache de dix minutes. Un nouveau modèle de votre offre apparaît dans',
    introC: 'sans nouvelle version.',
    chipsLabel: 'Modèles disponibles',
  },
  limits: {
    title: 'Là où ça fait mal',
    intro:
      'La liste honnête. Si l’un de ces points casse votre flux, le pont n’est pas le bon outil — et mieux vaut le savoir avant d’installer.',
    rows: [
      ['Latence', '~2s avec un worker chaud, 10–15s pendant que le pool se recharge'],
      ['Contexte', 'l’historique complet est sérialisé à chaque requête'],
      ['Transport', 'direct par défaut — le WASM embarqué signe la requête ; le CLI reste en secours'],
      ['Outils', 'négociés en texte, convertis en tool_use par le pont'],
    ],
    fullA: 'Le détail complet, y compris la raison pour laquelle l’API ne peut pas être appelée directement, se trouve dans le',
    fullB: 'dépôt',
  },
  footer: {
    readme: 'README',
    mit: 'MIT',
    contributing: 'Contribuer',
    source: 'Code',
    disclaimer:
      'Sans affiliation avec Anthropic ni Qoder. Claude Code et Claude sont des marques d’Anthropic ; Qoder est un produit de son propriétaire. Ce projet est un pont d’interopérabilité. Utilisez-le dans les conditions des comptes qui vous appartiennent.',
  },
  menu: { label: 'Langue', choose: 'Choisir la langue' },
};

export const de: Dict = {
  langName: 'Deutsch',
  langCode: 'DE',
  nav: { how: 'funktionsweise', limits: 'grenzen', github: 'GitHub' },
  hero: {
    badge: 'open source · MIT · keine Laufzeitabhängigkeiten',
    h1a: 'Das Terminal bleibt.',
    h1b: 'Das Modell wechselt.',
    p: 'qoder-claude ist eine lokale Anthropic-Messages-API-Bridge auf Basis deines Qoder-Tarifs. Claude Code behält seine Werkzeuge, seine Prompts und seine Effort-Regler; die Tokens kommen von Qoder.',
    then: 'dann öffne es mit',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'kopiert',
    flow: [
      { name: 'Claude Code', note: 'Werkzeuge, Prompt, Effort' },
      { name: 'qoder-bridge', note: 'zustandsloses HTTP + SSE' },
      { name: 'qoder WASM', note: 'lokale Signatur' },
      { name: 'api1.qoder.sh', note: 'signierte Anfrage' },
    ],
  },
  features: {
    title: 'Was sich nicht bewegt',
    intro:
      'Nur das Modell hinter dem Vorhang wechselt. Alles, womit du interagierst — Befehle, Werkzeuge, Berechtigungen, Konfiguration — bleibt genau, wo es war.',
    items: [
      {
        title: 'Tool-Aufrufe',
        body: 'Claude Code erhält weiterhin tool_use-Blöcke. Die Bridge lässt das Modell den Aufruf als Text formulieren und wandelt ihn um, bevor er den Client erreicht — Read, Write, Edit, Bash und Agent verhalten sich gleich.',
      },
      {
        title: 'Zugangsdaten',
        body: 'Das Qoder-Token bleibt in deinem Konfigurationsordner. Die Bridge liest es lokal, signiert jede Anfrage mit dem eingebetteten Qoder-WASM und leitet es an keinen anderen Host weiter.',
      },
      {
        title: 'Deine Regler',
        body: 'Modellauswahl, Effort-Stufe, Denkbudget, Statusline. Was du in Claude Code einstellst, kommt unverändert beim Modell an, weil die Bridge es weiterreicht.',
      },
      {
        title: 'Konto-Failover',
        body: 'Füge so viele Qoder-Konten hinzu, wie du willst. Erreicht eines sein Tageslimit, bekommt ein Rate Limit oder verliert seine Sitzung, pausiert die Bridge es und wiederholt dieselbe Anfrage beim nächsten Konto — ohne Neustart, ohne manuelles Umschalten.',
      },
    ],
  },
  models: {
    title: 'Modellliste statt Vermutung',
    introA: 'Die Bridge fragt',
    introB: 'mit zehn Minuten Cache. Ein neues Modell in deinem Tarif erscheint in',
    introC: 'ohne neues Release.',
    chipsLabel: 'Verfügbare Modelle',
  },
  limits: {
    title: 'Wo es weh tut',
    intro:
      'Die ehrliche Liste. Wenn einer dieser Punkte deinen Ablauf bricht, ist die Bridge nicht das richtige Werkzeug — besser vor der Installation wissen.',
    rows: [
      ['Latenz', '~2s mit warmem Worker, 10–15s während der Pool nachfüllt'],
      ['Kontext', 'der gesamte Verlauf wird bei jeder Anfrage serialisiert'],
      ['Transport', 'standardmäßig direkt — das eingebettete WASM signiert die Anfrage; die CLI bleibt als Fallback'],
      ['Werkzeuge', 'als Text ausgehandelt, von der Bridge in tool_use umgewandelt'],
    ],
    fullA: 'Alle Details, einschließlich des Grundes, warum die API nicht direkt aufgerufen werden kann, stehen im',
    fullB: 'Repository',
  },
  footer: {
    readme: 'README',
    mit: 'MIT',
    contributing: 'Mitwirken',
    source: 'Quellcode',
    disclaimer:
      'Keine Verbindung zu Anthropic oder Qoder. Claude Code und Claude sind Marken von Anthropic; Qoder ist ein Produkt des jeweiligen Inhabers. Dieses Projekt ist eine Interoperabilitäts-Bridge. Nutze es im Rahmen der Bedingungen deiner eigenen Konten.',
  },
  menu: { label: 'Sprache', choose: 'Sprache wählen' },
};
