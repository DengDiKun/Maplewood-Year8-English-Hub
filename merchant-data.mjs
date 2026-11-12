// Prompts and choices retained from the existing Unit 8.1 lesson.
export const MERCHANT_ACTIVITY = {
  "id": "unit-8-merchant-v1",
  "unit": 8,
  "kind": "merchant",
  "title": "8.1 The Merchant of Venice — Interactive lesson",
  "intro": "Read the three extracts, complete Activities 4 and 5, and choose a final interpretation.",
  "questions": [
    {
      "id": "q1",
      "label": "Prince of Morocco — His attitude",
      "options": [
        "He values appearance and wealth.",
        "He is nervous about losing Portia.",
        "He believes he deserves Portia."
      ]
    },
    {
      "id": "q2",
      "label": "Prince of Morocco — The scroll teaches",
      "options": [
        "Appearances can be misleading.",
        "Love is a reward for people who are already important.",
        "Only confident people make good choices."
      ]
    },
    {
      "id": "q3",
      "label": "Prince of Aragon — His attitude",
      "options": [
        "He values appearance and wealth.",
        "He is nervous about losing Portia.",
        "He believes he deserves Portia."
      ]
    },
    {
      "id": "q4",
      "label": "Prince of Aragon — The result teaches",
      "options": [
        "People who think too highly of themselves may be foolish.",
        "Gold always brings happiness.",
        "Choices should be made quickly."
      ]
    },
    {
      "id": "q5",
      "label": "Bassanio — His attitude",
      "options": [
        "He values appearance and wealth.",
        "He is anxious because the wrong choice could cost him Portia.",
        "He believes he deserves Portia."
      ]
    },
    {
      "id": "q6",
      "label": "Bassanio — The scroll teaches",
      "options": [
        "Choose according to appearance.",
        "Do not judge only by outward appearance.",
        "Risk is always a bad idea."
      ]
    },
    {
      "id": "q7",
      "label": "Morocco: What does “All that glitters is not gold” mean?"
    },
    {
      "id": "q8",
      "label": "Bassanio: What does “choose not by the view” mean?"
    },
    {
      "id": "q9",
      "label": "Activity 5 — Chosen viewpoint",
      "options": [
        "A It is clear that Portia wants Bassanio to succeed.",
        "B Although the men have a choice, Portia does not.",
        "C The extract shows that love is more important than money."
      ]
    },
    {
      "id": "q10",
      "label": "Activity 5 — Supporting quotation",
      "options": [
        "“I pray you, tarry: pause a day or two / Before you hazard…”",
        "“for, in choosing wrong, / I lose your company.”",
        "“Let me choose / For as I am, I live upon the rack.”",
        "“All that glitters is not gold”",
        "“You that choose not by the view, / Chance as fair and choose as true!”",
        "“I will assume desert.”"
      ]
    },
    {
      "id": "q11",
      "label": "Activity 5 — Explain how this quotation supports your viewpoint."
    },
    {
      "id": "q12",
      "label": "Final quest — Which interpretation do you agree with most?",
      "options": [
        "💰 Morocco shows that people can be distracted by appearance and wealth.",
        "🪞 Aragon shows that pride can distort a person’s judgement.",
        "❤️ Bassanio shows that genuine love looks beyond outward appearance."
      ]
    }
  ]
};
export const MERCHANT_CLAIMS = [
  {
    "key": "a",
    "text": "A It is clear that Portia wants Bassanio to succeed."
  },
  {
    "key": "b",
    "text": "B Although the men have a choice, Portia does not."
  },
  {
    "key": "c",
    "text": "C The extract shows that love is more important than money."
  }
];
export const MERCHANT_EVIDENCE = [
  {
    "key": "e1",
    "text": "“I pray you, tarry: pause a day or two / Before you hazard…”"
  },
  {
    "key": "e2",
    "text": "“for, in choosing wrong, / I lose your company.”"
  },
  {
    "key": "e3",
    "text": "“Let me choose / For as I am, I live upon the rack.”"
  },
  {
    "key": "e4",
    "text": "“All that glitters is not gold”"
  },
  {
    "key": "e5",
    "text": "“You that choose not by the view, / Chance as fair and choose as true!”"
  },
  {
    "key": "e6",
    "text": "“I will assume desert.”"
  }
];
export const MERCHANT_CORRECT = [
  "He values appearance and wealth.",
  "Appearances can be misleading.",
  "He believes he deserves Portia.",
  "People who think too highly of themselves may be foolish.",
  "He is anxious because the wrong choice could cost him Portia.",
  "Do not judge only by outward appearance."
];
export const MERCHANT_EVIDENCE_KEY = {
  "a": [
    "e1",
    "e2"
  ],
  "b": [
    "e2"
  ],
  "c": [
    "e2",
    "e5"
  ]
};
