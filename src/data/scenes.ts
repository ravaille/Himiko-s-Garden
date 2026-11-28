import type { Step } from "../core/story";

/**
 * Scripted scenes of the introduction (docs/design/13-intro-story.md). Dialogues are Romain's, except the ones marked DRAFT,
 * which Claude wrote to connect the scenes and which are to be rewritten by Romain.
 */

const olga = (text: string): Step => ({ t: "say", who: "Olga", text });
const mom = (text: string): Step => ({ t: "say", who: "Maman", text });

/** Olga's reaction after a duel, and his goodbye. */
const afterDuel: Step[] = [
  {
    t: "if",
    flag: "lastDuelWon",
    // DRAFT: the player won against all odds
    then: [
      olga("..."),
      olga("Tu m'as battu ? Moi ?"),
      olga("Hm. Voilà qui me rend... un peu triste, à vrai dire. Je pensais encore avoir de beaux jours devant moi."),
      olga("Mais je suis impressionné, vraiment. Tu as un vrai talent."),
      olga("Écoute-moi : le monde est bien plus grand que ce village. Va y chercher des joueurs plus forts que moi."),
    ],
    else: [
      olga("Tu as encore beaucoup à apprendre ! Hehehe, ce vieil homme en a encore sous le coude !"),
      olga("Mais ne fais pas cette tête. Tout le monde commence quelque part."),
      olga("Ce qui compte, ce n'est pas de gagner son premier duel. C'est d'avoir envie de livrer le suivant."),
      olga("Si tu veux progresser il te faudra voir du monde, voir le monde et rencontrer plus de joueurs !"),
    ],
  },
];

const duelOffer = (first: boolean): Step[] => [
  olga(first ? "Que dirais-tu d'un petit duel ?" : "Alors, une revanche ?"),
  {
    t: "choice",
    options: [
      {
        label: "Oui",
        then: [
          ...(first
            ? [olga("Ne t'inquiète pas, je vais y aller doucement."), olga("Enfin... je vais essayer !")]
            : [olga("Hehehe ! Voyons si tu as changé.")]),
          { t: "prompt", kind: "duel", arg: "olga" },
          { t: "add", flag: "olgaDuels", by: 1 },
          ...afterDuel,
        ],
      },
      {
        label: "Non",
        then: first
          ? [
              olga("Ce qui compte, ce n'est pas de gagner son premier duel. C'est d'avoir envie de livrer les suivants."),
              olga("Si tu veux progresser il te faudra voir du monde, voir le monde et rencontrer plus de joueurs !"),
            ]
          : [olga("Comme tu voudras. La porte reste ouverte.")],
      },
    ],
  },
];

export const SCENES: Record<string, Step[]> = {
  /** In the living room: the mother. Before the visit she repeats the task; afterwards she gives the first H-euros. */
  mom: [
    {
      t: "if",
      flag: "olgaDone",
      then: [
        {
          t: "if",
          flag: "momGift",
          // DRAFT
          then: [mom("Profites-en pour te faire plaisir à la boutique, mais ne dépense pas tout d'un coup !")],
          else: [
            mom("Te voilà ! Alors, comment ça s'est passé chez le voisin ?"),
            mom("Je suis fière de toi. Tiens, tu l'as bien mérité."),
            { t: "gold", amount: 200 },
            { t: "set", flag: "momGift" },
            { t: "say", text: "Tu reçois 200 H€ !" },
            mom("Va te faire plaisir à la boutique. Et reviens me raconter."),
            { t: "objective", text: "Explorer, rencontrer des joueurs, progresser." },
          ],
        },
      ],
      else: [mom("Le vieux monsieur t'attend, au bout du chemin. Ça ne prendra pas longtemps !")],
    },
  ],

  /** In front of Olga's house, then inside. */
  olgaOutside: [
    olga("Oh ? Qui voilà ?"),
    olga("Ah, c'est donc toi que madame m'envoie. Entre, entre !"),
    olga("Je dois bien avouer que quelques bras supplémentaires ne seraient pas de refus."),
    { t: "set", flag: "olgaMet" },
    { t: "prompt", kind: "teleport", arg: "olga:4:5:up" },
    { t: "cut", text: "…" },
    olga("Eh bien ! Voilà qui est déjà beaucoup mieux."),
    olga("Merci, jeune homme. Je commençais à me demander si j'allais devoir vivre au milieu de ces cartons jusqu'à la fin de mes jours !"),
    { t: "say", text: "Olga se dirige vers un vieux meuble et en sort un coffret." },
    olga("Tiens, approche donc."),
    { t: "say", text: "Il ouvre le coffret. Cinq cartes apparaissent." },
    olga("Ces cinq cartes m'ont accompagné pendant de nombreuses années."),
    olga("Chacune a une histoire, chacune a sa personnalité."),
    olga("Je ne joue plus vraiment aujourd'hui. Elles seraient probablement mieux entre les mains de quelqu'un qui saura les apprécier."),
    olga("Alors, choisis-en une. Celle qui te plaît le plus."),
    { t: "prompt", kind: "general" },
    olga("Excellent choix !"),
    olga("Prends-en soin. Ce n'est pas forcément la carte la plus puissante qui fait le meilleur joueur."),
    ...duelOffer(true),
    { t: "set", flag: "olgaDone" },
    { t: "objective", text: "Retourner voir Maman." },
  ],

  /** Back in Olga's house: another duel, until he politely refuses. */
  olgaInside: [
    {
      t: "if",
      flag: "olgaDuels",
      min: 2,
      // DRAFT
      then: [
        olga("Hm, non, non. Mes vieux os en ont assez pour aujourd'hui !"),
        olga("Tu progresseras plus vite ailleurs. Va donc à la ville voisine : tu y trouveras de quoi t'entraîner."),
      ],
      else: duelOffer(false),
    },
  ],
};
