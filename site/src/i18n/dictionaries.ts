export type Dict = {
  langName: string;
  langCode: string;
  nav: { how: string; limits: string; docs: string; github: string };
  hero: {
    badge: string;
    getStarted: string;
    readDocs: string;
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
  footer: { readme: string; docs: string; mit: string; contributing: string; source: string; disclaimer: string };
  menu: { label: string; choose: string };
};

export const en: Dict = {
  langName: 'English',
  langCode: 'EN',
  nav: { how: 'how it works', limits: 'limits', docs: 'Docs', github: 'GitHub' },
  hero: {
    badge: 'open source · MIT · zero runtime dependencies',
    getStarted: 'Get started',
    readDocs: 'Read the docs',
    h1a: 'The terminal stays.',
    h1b: 'The model changes.',
    p: 'qoder-claude is a local Anthropic Messages API bridge backed by your Qoder plan. Claude Code keeps its tools, its prompts and its effort controls; the tokens come from Qoder.',
    then: 'then open it with',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copied',
    flow: [
      { name: 'Claude Code', note: 'tools, prompt, effort' },
      { name: 'qoder-claude', note: 'stateless HTTP + SSE' },
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
      {
        title: '1M context',
        body: 'Every model runs with a 1M window. The picker tells the client to treat the Qoder id like a known 1M model, and the Qoder side receives context_window: 1000000 on every request.',
      },
      {
        title: 'Web search',
        body: 'Deferred tools arrive by name only; the bridge supplies a schema and routes WebSearch to the Exa MCP, which the installer configures and allowlists — so results come back real instead of empty.',
      },
      {
        title: 'Images',
        body: 'Paste a screenshot and the model reads it. Image turns run through a bundled image engine, installed once with qclaude vision install.',
      },
      {
        title: 'Real quota',
        body: 'Every account card shows the credits Qoder actually reports: used, remaining, burn rate and the date the quota runs out. Usage rows say whether tokens are real or estimated. The daily 100-credit campaign appears there too, with a Claim button.',
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
      ['Latency', '1–2 s per turn warm, ~2 s right after start; tool round-trips add 3–15 s'],
      ['Context', '1M by default; the full history still travels on every request'],
      ['Transport', 'direct by default — the embedded WASM signs the request; the CLI stays as fallback'],
      ['Tools', 'client-side, including WebSearch/WebFetch and MCP; web tools get a schema and an allow rule'],
    ],
    fullA: 'Full detail, including how each request is signed locally, lives in the',
    fullB: 'repository',
  },
  footer: {
    readme: 'README',
    docs: 'Docs',
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
  nav: { how: 'como funciona', limits: 'limites', docs: 'Docs', github: 'GitHub' },
  hero: {
    badge: 'código aberto · MIT · zero dependências de runtime',
    getStarted: 'Começar',
    readDocs: 'Ler os docs',
    h1a: 'O terminal fica.',
    h1b: 'O modelo muda.',
    p: 'qoder-claude é uma bridge local da Anthropic Messages API apoiada no seu plano Qoder. O Claude Code mantém as ferramentas, os prompts e os controles de esforço; os tokens vêm do Qoder.',
    then: 'depois abra com',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copiado',
    flow: [
      { name: 'Claude Code', note: 'ferramentas, prompt, esforço' },
      { name: 'qoder-claude', note: 'HTTP + SSE sem estado' },
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
      {
        title: 'Contexto de 1M',
        body: 'Todo modelo roda com janela de 1M. O picker faz o cliente tratar o id do Qoder como um modelo conhecido de 1M, e o lado do Qoder recebe context_window: 1000000 em cada requisição.',
      },
      {
        title: 'Busca na web',
        body: 'Ferramentas deferred chegam só pelo nome; a bridge entrega o schema e roteia o WebSearch para o MCP Exa, que o instalador configura e libera na allowlist — resultado real em vez de lista vazia.',
      },
      {
        title: 'Imagens',
        body: 'Cole um print e o modelo lê. Turnos com imagem rodam num motor de imagem embutido, instalado uma vez com qclaude vision install.',
      },
      {
        title: 'Cota real',
        body: 'Cada card de conta mostra os créditos que a Qoder realmente informa: usados, restantes, consumo e a data em que a cota acaba. As linhas de uso dizem se os tokens são reais ou estimados. A campanha diária de 100 créditos também aparece ali, com botão de resgate.',
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
      ['Latência', '1–2 s por turno quente, ~2 s logo após o start; round-trip de ferramenta soma 3–15 s'],
      ['Contexto', '1M por padrão; o histórico inteiro continua indo em cada requisição'],
      ['Transporte', 'direto por padrão — o WASM embutido assina a requisição; o CLI fica como fallback'],
      ['Ferramentas', 'do lado do cliente, incluindo WebSearch/WebFetch e MCP; as web tools ganham schema e regra de allow'],
    ],
    fullA: 'O detalhe completo, incluindo como cada request é assinado localmente, está no',
    fullB: 'repositório',
  },
  footer: {
    readme: 'README',
    docs: 'Docs',
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
  nav: { how: 'cómo funciona', limits: 'límites', docs: 'Docs', github: 'GitHub' },
  hero: {
    badge: 'código abierto · MIT · sin dependencias de ejecución',
    getStarted: 'Empezar',
    readDocs: 'Leer los docs',
    h1a: 'La terminal se queda.',
    h1b: 'El modelo cambia.',
    p: 'qoder-claude es un puente local de Anthropic Messages API apoyado en tu plan de Qoder. Claude Code conserva sus herramientas, sus prompts y sus controles de esfuerzo; los tokens vienen de Qoder.',
    then: 'luego ábrelo con',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copiado',
    flow: [
      { name: 'Claude Code', note: 'herramientas, prompt, esfuerzo' },
      { name: 'qoder-claude', note: 'HTTP + SSE sin estado' },
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
      {
        title: 'Contexto de 1M',
        body: 'Todos los modelos corren con ventana de 1M. El picker hace que el cliente trate el id de Qoder como un modelo conocido de 1M, y el lado de Qoder recibe context_window: 1000000 en cada petición.',
      },
      {
        title: 'Búsqueda web',
        body: 'Las herramientas deferred llegan solo por nombre; el puente entrega el esquema y enruta WebSearch al MCP Exa, que el instalador configura y añade a la allowlist — resultados reales en vez de lista vacía.',
      },
      {
        title: 'Imágenes',
        body: 'Pega una captura y el modelo la lee. Los turnos con imagen usan un motor de imagen embebido, instalado una vez con qclaude vision install.',
      },
      {
        title: 'Cota real',
        body: 'Cada tarjeta de cuenta muestra los créditos que Qoder informa de verdad: usados, restantes, consumo y la fecha en que se agota la cuota. Las filas de uso indican si los tokens son reales o estimados. La campaña diaria de 100 créditos también aparece allí, con botón de reclamar.',
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
      ['Latencia', '1–2 s por turno en caliente, ~2 s justo tras el inicio; un round-trip de herramienta suma 3–15 s'],
      ['Contexto', '1M por defecto; el historial completo sigue viajando en cada petición'],
      ['Transporte', 'directo por defecto — el WASM embebido firma la petición; el CLI queda como fallback'],
      ['Herramientas', 'del lado del cliente, incluidas WebSearch/WebFetch y MCP; las web tools reciben esquema y regla de allow'],
    ],
    fullA: 'El detalle completo, incluido cómo se firma cada petición localmente, está en el',
    fullB: 'repositorio',
  },
  footer: {
    readme: 'README',
    docs: 'Docs',
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
  nav: { how: 'fonctionnement', limits: 'limites', docs: 'Docs', github: 'GitHub' },
  hero: {
    badge: 'open source · MIT · aucune dépendance à l’exécution',
    getStarted: 'Commencer',
    readDocs: 'Lire la doc',
    h1a: 'Le terminal reste.',
    h1b: 'Le modèle change.',
    p: 'qoder-claude est un pont local Anthropic Messages API adossé à votre offre Qoder. Claude Code garde ses outils, ses prompts et ses réglages d’effort ; les jetons viennent de Qoder.',
    then: 'puis ouvrez-le avec',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'copié',
    flow: [
      { name: 'Claude Code', note: 'outils, prompt, effort' },
      { name: 'qoder-claude', note: 'HTTP + SSE sans état' },
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
      {
        title: 'Contexte 1M',
        body: 'Chaque modèle tourne avec une fenêtre de 1M. Le sélecteur fait traiter l’id Qoder comme un modèle 1M connu, et le côté Qoder reçoit context_window : 1000000 à chaque requête.',
      },
      {
        title: 'Recherche web',
        body: 'Les outils deferred arrivent par leur nom ; le pont fournit le schéma et route WebSearch vers le MCP Exa, que l’installateur configure et autorise — de vrais résultats au lieu d’une liste vide.',
      },
      {
        title: 'Images',
        body: 'Collez une capture et le modèle la lit. Les tours avec image passent par un moteur d’image embarqué, installé une fois avec qclaude vision install.',
      },
      {
        title: 'Quota réelle',
        body: 'Chaque carte de compte affiche les crédits réellement rapportés par Qoder : utilisés, restants, consommation et date d’épuisement. Les lignes d’usage indiquent si les jetons sont réels ou estimés. La campagne quotidienne de 100 crédits apparaît aussi, avec un bouton de réclamation.',
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
      ['Latence', '1–2 s par tour à chaud, ~2 s juste après le démarrage ; un aller-retour d’outil ajoute 3–15 s'],
      ['Contexte', '1M par défaut ; l’historique complet voyage toujours à chaque requête'],
      ['Transport', 'direct par défaut — le WASM embarqué signe la requête ; le CLI reste en secours'],
      ['Outils', 'côté client, y compris WebSearch/WebFetch et MCP ; les web tools reçoivent un schéma et une règle allow'],
    ],
    fullA: 'Le détail complet, y compris la signature locale de chaque requête, se trouve dans le',
    fullB: 'dépôt',
  },
  footer: {
    readme: 'README',
    docs: 'Docs',
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
  nav: { how: 'funktionsweise', limits: 'grenzen', docs: 'Docs', github: 'GitHub' },
  hero: {
    badge: 'open source · MIT · keine Laufzeitabhängigkeiten',
    getStarted: 'Loslegen',
    readDocs: 'Doku lesen',
    h1a: 'Das Terminal bleibt.',
    h1b: 'Das Modell wechselt.',
    p: 'qoder-claude ist eine lokale Anthropic-Messages-API-Bridge auf Basis deines Qoder-Tarifs. Claude Code behält seine Werkzeuge, seine Prompts und seine Effort-Regler; die Tokens kommen von Qoder.',
    then: 'dann öffne es mit',
    tabs: { cmd: 'Windows · CMD', ps: 'Windows · PowerShell', sh: 'Linux · macOS' },
    copied: 'kopiert',
    flow: [
      { name: 'Claude Code', note: 'Werkzeuge, Prompt, Effort' },
      { name: 'qoder-claude', note: 'zustandsloses HTTP + SSE' },
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
      {
        title: '1M-Kontext',
        body: 'Jedes Modell läuft mit einem 1M-Fenster. Der Picker lässt den Client die Qoder-ID wie ein bekanntes 1M-Modell behandeln, und Qoder erhält bei jeder Anfrage context_window: 1000000.',
      },
      {
        title: 'Websuche',
        body: 'Deferred Tools kommen nur mit Namen an; die Bridge liefert ein Schema und leitet WebSearch an den Exa-MCP weiter, den der Installer einrichtet und freigibt — echte Ergebnisse statt leerer Liste.',
      },
      {
        title: 'Bilder',
        body: 'Screenshot einfügen und das Modell liest ihn. Bild-Turns laufen über eine eingebettete Bild-Engine, einmalig installiert mit qclaude vision install.',
      },
      {
        title: 'Echtes Kontingent',
        body: 'Jede Kontokarte zeigt die von Qoder gemeldeten Credits: verbraucht, verbleibend, Verbrauchsrate und das Datum, an dem das Kontingent endet. Nutzungszeilen zeigen, ob Token echt oder geschätzt sind. Die tägliche 100-Credit-Kampagne erscheint dort ebenfalls mit Abhol-Button.',
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
      ['Latenz', '1–2 s pro Turn warm, ~2 s direkt nach dem Start; ein Tool-Roundtrip kostet 3–15 s mehr'],
      ['Kontext', '1M standardmäßig; der gesamte Verlauf geht weiterhin bei jeder Anfrage mit'],
      ['Transport', 'standardmäßig direkt — das eingebettete WASM signiert die Anfrage; die CLI bleibt als Fallback'],
      ['Werkzeuge', 'clientseitig, inklusive WebSearch/WebFetch und MCP; Web-Tools bekommen Schema und Allow-Regel'],
    ],
    fullA: 'Alle Details, einschließlich der lokalen Signatur jeder Anfrage, stehen im',
    fullB: 'Repository',
  },
  footer: {
    readme: 'README',
    docs: 'Docs',
    mit: 'MIT',
    contributing: 'Mitwirken',
    source: 'Quellcode',
    disclaimer:
      'Keine Verbindung zu Anthropic oder Qoder. Claude Code und Claude sind Marken von Anthropic; Qoder ist ein Produkt des jeweiligen Inhabers. Dieses Projekt ist eine Interoperabilitäts-Bridge. Nutze es im Rahmen der Bedingungen deiner eigenen Konten.',
  },
  menu: { label: 'Sprache', choose: 'Sprache wählen' },
};
