import {MERCHANT_ACTIVITY} from './merchant-data.mjs?v=merchant-1';
// Curriculum and Hub-created prompts carried over from unit-course.html.
// This is a content catalogue, never an authorization or identity source.
const source = {
  "U": {
    "1": {
      "title": "Nature and humans",
      "page": 8,
      "types": "Contemporary fiction; non-fiction (travel writing); poetry; non-fiction (science topic); personal account",
      "reading": [
        "When the Mountains Roared",
        "Higher into the Hills",
        "The Eagle",
        "Poetry by Tu Fu",
        "Climate change: a natural process",
        "We’re destroying our home",
        "Tsunami witness"
      ],
      "writing": "Audio drama; writing informally; imaginative accounts",
      "speaking": "Pair discussion and prediction; script reading; discussing views; audio biography; reading a poem aloud; discussing text structure",
      "language": "Verb tenses for effect; end-stopping, enjambment and caesura; formal/informal language; unfamiliar-word strategies",
      "skills": "Creativity; collaboration",
      "video": {
        "kind": "link",
        "url": "https://education.nationalgeographic.org/resource/climate-101-cause-and-effect/",
        "label": "National Geographic — Climate 101: Cause and Effect"
      }
    },
    "2": {
      "title": "Grandmother’s Song",
      "page": 38,
      "types": "Short story (moral tale); poem",
      "reading": [
        "Grandmother’s Song",
        "Jessie Emily Schofield"
      ],
      "writing": "Combining techniques; analysis of structure; writing dialogue; analysing theme; biographical account",
      "speaking": "Pair and group discussion; unseen dialogue",
      "language": "Figurative language; reporting verbs to show character and mood",
      "skills": "Critical thinking; communication",
      "video": {
        "kind": "youtube",
        "id": "A0edKgL9EgM",
        "label": "TED-Ed — The art of the metaphor"
      }
    },
    "3": {
      "title": "Strange islands",
      "page": 64,
      "types": "Non-fiction for different audiences; pre-20th century prose; modern drama; contemporary prose",
      "reading": [
        "The Oak Island mystery",
        "The kool kidz diggin’ for Kidd’s treasure",
        "Odd Islands Around the Globe",
        "Treasure Island",
        "The Lost Isle of Tamarind"
      ],
      "writing": "Writing a monologue; writing a play; account from a character’s viewpoint",
      "speaking": "Pair discussion; individual speaking; performing a play",
      "language": "Punctuation for effect; dialogue in play scripts; strategies for spelling unfamiliar words",
      "skills": "Collaboration; creativity",
      "video": {
        "kind": "youtube",
        "id": "S71bIo1X8kU",
        "label": "BBC Learning English — Treasure Island"
      }
    },
    "4": {
      "title": "This is the modern world",
      "page": 91,
      "types": "Non-fiction articles; argumentative texts; entertaining articles; text summaries; contemporary fiction",
      "reading": [
        "How the web was born",
        "Sir Tim Berners-Lee: a brief guide",
        "Two views: a blog",
        "The future is here!",
        "Rise of the Machines",
        "The Queue",
        "Leila",
        "Why we love terrible stories",
        "The Maze Runner"
      ],
      "writing": "Article for an older audience; persuasive speech; story submission; describing setting",
      "speaking": "Pair and group discussion",
      "language": "Placement of sentence types for effect; clarity of language; choice of synonyms",
      "skills": "Creativity; critical thinking",
      "video": {
        "kind": "youtube",
        "id": "k0gvAyCubGQ",
        "label": "CERN — A brief history of the World Wide Web"
      }
    },
    "5": {
      "title": "Heroes",
      "page": 120,
      "types": "Discursive writing; argumentative writing; contemporary prose; newspaper article; online advice text; newspaper accounts; drama",
      "reading": [
        "Modern heroes",
        "The age of false heroes",
        "Tokyo: Life as a young carer",
        "Supporting Young Carers",
        "A super-real type of film",
        "Stan Lee’s final creation was a Chinese superhero",
        "Enviros"
      ],
      "writing": "Counter-argument; challenging setting; blog from a character’s viewpoint; film script",
      "speaking": "Pair discussion; script performance; debating views",
      "language": "Coordinating/subordinating conjunctions in arguments; imperatives and modal verbs in advice",
      "skills": "Social responsibility; collaboration",
      "video": {
        "kind": "youtube",
        "id": "Hhk4N9A0oCA",
        "label": "TED-Ed — What makes a hero?"
      }
    },
    "6": {
      "title": "Monsters",
      "page": 148,
      "types": "Non-fiction magazine article; online article; pre-20th century prose; poetry; newspaper article",
      "reading": [
        "The Hunt for Chupacabra",
        "How Monsters Under the Bed Became a Common Childhood Fear",
        "The Selfish Giant",
        "The Scorpion",
        "Shadow of the Scorpion",
        "Monster fatbergs"
      ],
      "writing": "Account writing; design a leaflet; write a fable; comparing poems; imaginative account",
      "speaking": "Pair and group discussion",
      "language": "Emotive language; extended metaphors",
      "skills": "Critical thinking; learning to learn",
      "video": {
        "kind": "youtube",
        "id": "gL_6bKFlLio",
        "label": "TEDx — Why do we like to be scared?"
      }
    },
    "7": {
      "title": "The Plantation",
      "page": 174,
      "types": "Short story (tragedy)",
      "reading": [
        "The Plantation — opening",
        "The Plantation — character development",
        "The Plantation — conflict and symbolism",
        "The Plantation — later extracts",
        "The Plantation — ending and reflection"
      ],
      "writing": "Diary entries; character analysis; monologues; technique analysis; personal account; report writing",
      "speaking": "Pair/group discussion; monologue; news report",
      "language": "Adjectives to show specific qualities; active and passive voice",
      "skills": "Social responsibility; creativity",
      "video": {
        "kind": "youtube",
        "id": "38QqDrckyxM",
        "label": "BBC Learning English — Active and passive voice"
      }
    },
    "8": {
      "title": "Choices and decisions",
      "page": 200,
      "types": "Pre-20th century drama; poetry; short story; analytical article; newspaper account; blog; argumentative writing",
      "reading": [
        "The Merchant of Venice",
        "The Road Not Taken",
        "No Going Back",
        "Top 10 ways to make better decisions",
        "Tourist feared he would die",
        "To be a refugee is to make impossible choices",
        "Do developed countries have a responsibility to welcome refugees?"
      ],
      "writing": "Drama scene; poem; account writing; personal response; argument",
      "speaking": "Pair, group performance and individual discussion",
      "language": "Adverbs of manner/degree/time; linking adverbs; prepositional phrases",
      "skills": "Learning to learn; communication",
      "video": {
        "kind": "youtube",
        "id": "3-ahNeWAGvE",
        "label": "Decision-making learning video"
      }
    },
    "9": {
      "title": "Endings",
      "page": 225,
      "types": "Personal writing; poetry; autobiography; contemporary fiction",
      "reading": [
        "I was the sun, and the kids were my planets",
        "To a Daughter Leaving Home",
        "Home For Thanksgiving",
        "Taming the Tiger",
        "When the Mountains Roared"
      ],
      "writing": "Responding to feelings; comparing poems; trailer script writing; debating heroism",
      "speaking": "Pair, group and individual discussion",
      "language": "Coordinating conjunctions; present participles",
      "skills": "Creativity; collaboration",
      "video": {
        "kind": "youtube",
        "id": "H8E5EF0IEN0",
        "label": "BBC Learning English — Participle clauses"
      }
    }
  },
  "exactSubunits": {
    "1": [
      "The leopard",
      "The mysterious figure",
      "The wildness of eagles",
      "The poetry of Tu Fu",
      "Destroying the planet",
      "Tsunami"
    ],
    "2": [
      "Life in the village",
      "Making progress",
      "Growing up",
      "Climbing the mountains alone",
      "Celebrating grandparents",
      "Comparing texts"
    ],
    "3": [
      "The mystery of Oak Island",
      "Strange islands",
      "Treasure Island: Meeting Ben Gunn",
      "Treasure Island: The play",
      "Singing sand",
      "Helix"
    ],
    "4": [
      "The birth of the internet",
      "Phone problems",
      "Predicting the future",
      "A dystopian future",
      "The Glade",
      "Closing doors"
    ],
    "5": [
      "Defining heroes",
      "Looking for Charlie",
      "Danger?",
      "Young Heroes",
      "Superheroes",
      "Film scripting"
    ],
    "7": [
      "The Broken Pipe",
      "Namidi’s Family",
      "Namidi and Mama Efe"
    ],
    "8": [
      "The Merchant of Venice",
      "Life choices",
      "Making decisions"
    ]
  },
  "strandTasks": {
    "1": {
      "writing": "Write a short imaginative account showing a person reacting to a powerful natural event. Use tense choices deliberately.",
      "speaking": "Prepare a 1-minute explanation: How can humans affect nature, and how can nature affect humans?",
      "language": "Write four sentences about nature: two formal and two informal. Then label one caesura, enjambment or end-stopped line from a poem your teacher assigns."
    },
    "2": {
      "writing": "Write a short dialogue in which reporting verbs reveal two characters’ different moods.",
      "speaking": "Give a 1-minute explanation of a moral or theme from a story or poem studied in this unit.",
      "language": "Create two original examples of figurative language and explain the effect of each."
    },
    "3": {
      "writing": "Write a 120-word monologue from the viewpoint of someone arriving on a mysterious island.",
      "speaking": "Perform a short dramatic explanation of one mystery and explain why people remain interested in it.",
      "language": "Write three lines of dialogue using punctuation accurately for effect."
    },
    "4": {
      "writing": "Write a short article paragraph for an older audience explaining one way technology has changed everyday life.",
      "speaking": "Give a 1-minute persuasive response: Has modern technology improved life overall?",
      "language": "Rewrite three vague sentences using clearer and more precise synonyms."
    },
    "5": {
      "writing": "Write a counter-argument to the claim: “Only famous people can be heroes.”",
      "speaking": "Prepare a 1-minute mini-debate: What qualities should a real hero have?",
      "language": "Write one sentence with a coordinating conjunction, one with a subordinating conjunction, and one piece of advice using a modal verb."
    },
    "6": {
      "writing": "Write a short imaginative account in which something ordinary is described as frightening. Use emotive language or an extended metaphor.",
      "speaking": "Explain which is more effective for creating fear: description, sound, or uncertainty. Give a reason.",
      "language": "Create one emotive sentence and one extended-metaphor sentence, then explain their effect."
    },
    "7": {
      "writing": "Write a short report paragraph about a dangerous or chaotic event. Include at least one passive-voice sentence.",
      "speaking": "Deliver a 1-minute news report about an important event in the story or a related scenario.",
      "language": "Rewrite one active sentence in the passive voice and choose precise adjectives to describe a tense character."
    },
    "8": {
      "writing": "Write a short account of a difficult decision, using linking and time adverbs to organise the sequence.",
      "speaking": "Explain one difficult choice a fictional character could face and justify the best decision.",
      "language": "Write three sentences using an adverb of manner, an adverb of time and a linking adverb."
    },
    "9": {
      "writing": "Write a reflective ending to a short story in 100–120 words. Show how the character feels about what has changed.",
      "speaking": "Give a 1-minute reflection on why endings matter in stories and real life.",
      "language": "Write two sentences using coordinating conjunctions and two sentences beginning with present participles."
    }
  },
  "quizData": {
    "1": [
      [
        "Which feature creates a pause inside a poetic line?",
        "Caesura",
        [
          "Enjambment",
          "Caesura",
          "Rhyme"
        ]
      ],
      [
        "Which register suits a message to a close friend?",
        "Informal",
        [
          "Formal",
          "Informal",
          "Scientific"
        ]
      ]
    ],
    "2": [
      [
        "“The moon was a silver coin” is mainly a…",
        "Metaphor",
        [
          "Metaphor",
          "Reporting verb",
          "Question"
        ]
      ],
      [
        "Which reporting verb best suggests anger?",
        "snapped",
        [
          "whispered",
          "snapped",
          "wondered"
        ]
      ]
    ],
    "3": [
      [
        "In a play script, spoken words are usually organised as…",
        "Dialogue",
        [
          "Dialogue",
          "Footnotes",
          "Headings"
        ]
      ],
      [
        "Punctuation can be used for…",
        "Effect and clarity",
        [
          "Decoration only",
          "Effect and clarity",
          "Page numbering"
        ]
      ]
    ],
    "4": [
      [
        "A short sentence placed after long sentences can create…",
        "Emphasis",
        [
          "Less meaning",
          "Emphasis",
          "A spelling rule"
        ]
      ],
      [
        "A synonym is…",
        "A word with a similar meaning",
        [
          "An opposite word",
          "A word with a similar meaning",
          "A punctuation mark"
        ]
      ]
    ],
    "5": [
      [
        "Which word can introduce a counter-argument?",
        "However",
        [
          "Because",
          "However",
          "Suddenly"
        ]
      ],
      [
        "“You should…” uses a…",
        "Modal verb",
        [
          "Modal verb",
          "Article",
          "Pronoun only"
        ]
      ]
    ],
    "6": [
      [
        "Language chosen to create strong feelings is…",
        "Emotive language",
        [
          "Neutral listing",
          "Emotive language",
          "A citation"
        ]
      ],
      [
        "An extended metaphor…",
        "Develops one comparison across several lines/ideas",
        [
          "Uses one adjective",
          "Develops one comparison across several lines/ideas",
          "Avoids imagery"
        ]
      ]
    ],
    "7": [
      [
        "“The report was completed by the team” is…",
        "Passive voice",
        [
          "Active voice",
          "Passive voice",
          "Direct speech"
        ]
      ],
      [
        "Precise adjectives help a writer…",
        "Show specific qualities",
        [
          "Hide all detail",
          "Show specific qualities",
          "Remove description"
        ]
      ]
    ],
    "8": [
      [
        "“Hesitantly” is mainly an adverb of…",
        "Manner",
        [
          "Manner",
          "Place",
          "Number"
        ]
      ],
      [
        "“However” can work as a…",
        "Linking adverb",
        [
          "Linking adverb",
          "Noun",
          "Pronoun"
        ]
      ]
    ],
    "9": [
      [
        "“Walking home, she reflected…” begins with a…",
        "Present participle",
        [
          "Past tense only",
          "Present participle",
          "Modal verb"
        ]
      ],
      [
        "Coordinating conjunctions include…",
        "and, but, or",
        [
          "and, but, or",
          "because, although, since",
          "very, slowly, soon"
        ]
      ]
    ]
  }
};

const challengeQuestions = [
  {
    "id": "q1",
    "label": "1. What is the narrator preparing to do? [AO1]"
  },
  {
    "id": "q2",
    "label": "2. Write two details that show the narrator is nervous before the speech. [AO1]"
  },
  {
    "id": "q3",
    "label": "3. Copy one phrase that compares the audience to the sea. [AO1]"
  },
  {
    "id": "q4",
    "label": "4. Who gives the narrator advice before the speech? [AO1]"
  },
  {
    "id": "q5",
    "label": "5. Explain the writer's effect in: “Her calm voice was a lighthouse at the edge of my storm.” [AO2]"
  },
  {
    "id": "q6",
    "label": "6. How does the mood change from the beginning to the end? Use one short quotation. [AO3]"
  },
  {
    "id": "q7",
    "label": "7. What problem did the Year 8 students notice in the courtyard? [AO1]"
  },
  {
    "id": "q8",
    "label": "8. Write two actions the team took after some students ignored or misused the boxes. [AO1]"
  },
  {
    "id": "q9",
    "label": "9. Give two improvements seen after three weeks. [AO1]"
  },
  {
    "id": "q10",
    "label": "10. Explain the effects of “only a small spark” and “Their enthusiasm soon caught fire.” [AO2]"
  },
  {
    "id": "q11",
    "label": "11. Compare the effects of the two extended metaphors. What does each metaphor help the reader understand? [AO3]"
  }
];

function freeze(value) {
  if(value && typeof value==='object') {Object.values(value).forEach(freeze);Object.freeze(value);}
  return value;
}
const readingQuestions = [
  {id:'q1',label:'Before reading: What do you predict from the title?'},
  {id:'q2',label:'Evidence: Copy one short word or phrase that seems important.'},
  {id:'q3',label:'Analysis: What does this evidence suggest, and what effect does it create?'}
];
const strandLabels={writing:'Writing Studio',speaking:'Speaking / Listening Lab',language:'Language Workshop'};
export const UNITS=freeze(Object.entries(source.U).map(([key,unit])=>{
  const number=Number(key), readings=source.exactSubunits[number] || unit.reading;
  const activities=readings.map((title,index)=>({
    id:'unit-'+number+'-reading-'+(index+1)+'-v1',unit:number,kind:'reading',
    title:(source.exactSubunits[number]?number+'.'+(index+1)+' ':'Reading '+(index+1)+' — ')+title,
    intro:'Use the Learner’s Book text assigned by your teacher. Read the text before answering; support your analysis with evidence.',
    questions:readingQuestions
  }));
  for(const [kind,label] of Object.entries(strandLabels)) activities.push({
    id:'unit-'+number+'-'+kind+'-v1',unit:number,kind,title:label,
    intro:'A Hub-created extension aligned to this unit’s curriculum.',
    questions:[{id:'q1',label:source.strandTasks[number][kind]}]
  });
  if(number===6)activities.unshift({id:'writers-effect-v1',unit:6,kind:'challenge',
    title:'Writer’s Effect Challenge',intro:'Read two texts and explain their language effects.',questions:challengeQuestions});
  if(number===8)activities.unshift(MERCHANT_ACTIVITY);
  return {number,...unit,readings,activities,quiz:source.quizData[number]};
}));
export const ACTIVITIES=freeze(UNITS.flatMap(unit=>unit.activities));
const byId=new Map(ACTIVITIES.map(activity=>[activity.id,activity]));
export function getActivity(id) {return byId.get(id);}
export function getUnit(number) {return UNITS.find(unit=>unit.number===number);}
