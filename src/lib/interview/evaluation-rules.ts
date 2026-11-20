import type { CriterionRule, EvaluationFramework } from "./evaluation-types";

export const EVALUATION_RULES: Record<EvaluationFramework, CriterionRule[]> = {
  STAR: [
    {
      id: "situation",
      name: "Situation",
      weight: 20,
      description: "Explains the background and context.",
      indicators: [
        /\b(when|while|during|at the time|in my previous|in one of my)\b/i,
        /\b(project|team|company|workplace|client|customer|situation)\b/i,
      ],
      missingFeedback: "Explain the situation and give enough background.",
      partialFeedback:
        "Add more context so the interviewer understands the situation.",
      strongFeedback: "Your answer provides useful background and context.",
    },
    {
      id: "task",
      name: "Task",
      weight: 20,
      description: "Explains the responsibility or objective.",
      indicators: [
        /\b(my responsibility|my role|I was responsible|I needed to|I had to)\b/i,
        /\b(goal|objective|deadline|target|required|expected|task)\b/i,
      ],
      missingFeedback: "Explain what you were responsible for achieving.",
      partialFeedback: "Clarify your specific responsibility or objective.",
      strongFeedback:
        "Your responsibility and objective are clearly expressed.",
    },
    {
      id: "action",
      name: "Action",
      weight: 35,
      description: "Explains the candidate's personal contribution.",
      indicators: [
        /\b(I|my)\b/i,
        /\b(implemented|created|built|developed|organized|analysed|analyzed|resolved|designed|communicated|coordinated|tested|improved|led|managed|investigated|decided|introduced)\b/i,
      ],
      missingFeedback: "Explain the specific actions you personally took.",
      partialFeedback: "Give more detail about what you personally did.",
      strongFeedback: "Your answer identifies concrete personal actions.",
    },
    {
      id: "result",
      name: "Result",
      weight: 25,
      description: "Explains the outcome, impact or lesson.",
      indicators: [
        /\b(result|outcome|impact|achieved|improved|reduced|increased|completed|saved|delivered|resolved|learned|lesson)\b/i,
        /\b(\d+(?:\.\d+)?%?|\d+\s+(?:users|customers|hours|days|weeks|months|projects))\b/i,
      ],
      missingFeedback: "Explain what happened as a result of your actions.",
      partialFeedback:
        "Describe the outcome more clearly. Include a real metric if you have one.",
      strongFeedback: "Your answer describes an outcome or measurable impact.",
    },
  ],

  TECHNICAL_REASONING: [
    {
      id: "understanding",
      name: "Problem understanding",
      weight: 20,
      description: "Explains the problem and its requirements.",
      indicators: [
        /\b(problem|issue|challenge|requirement|bug|error|constraint)\b/i,
        /\b(expected|actual|needed|required|because)\b/i,
      ],
      missingFeedback: "Start by explaining the problem you were solving.",
      partialFeedback: "Clarify the requirements and constraints.",
      strongFeedback: "You identify the problem and its context.",
    },
    {
      id: "approach",
      name: "Solution approach",
      weight: 25,
      description: "Explains the proposed implementation.",
      indicators: [
        /\b(approach|solution|implemented|used|built|created|designed|developed|configured)\b/i,
        /\b(first|then|next|finally|step|process)\b/i,
      ],
      missingFeedback: "Describe the technical solution you used.",
      partialFeedback: "Explain the implementation steps in more detail.",
      strongFeedback: "Your answer describes a clear implementation approach.",
    },
    {
      id: "reasoning",
      name: "Technical reasoning",
      weight: 25,
      description: "Explains why the approach was selected.",
      indicators: [
        /\b(because|therefore|so that|in order to|the reason|chose|selected|decided)\b/i,
        /\b(performance|security|scalability|maintainability|reliability|complexity|trade-off|tradeoff)\b/i,
      ],
      missingFeedback: "Explain why you selected this particular solution.",
      partialFeedback: "Connect your technical decisions to their reasons.",
      strongFeedback: "You provide reasoning behind your technical decisions.",
    },
    {
      id: "tradeoffs",
      name: "Trade-offs and alternatives",
      weight: 15,
      description: "Considers alternatives and limitations.",
      indicators: [
        /\b(alternative|alternatives|instead|however|although|limitation|trade-off|tradeoff)\b/i,
        /\b(advantage|disadvantage|benefit|cost|downside|compromise)\b/i,
      ],
      missingFeedback: "Discuss an alternative or limitation of your solution.",
      partialFeedback:
        "Explain what you gained or sacrificed with your approach.",
      strongFeedback:
        "You demonstrate awareness of alternatives and trade-offs.",
    },
    {
      id: "outcome",
      name: "Validation and outcome",
      weight: 15,
      description: "Explains how the solution was validated.",
      indicators: [
        /\b(test|tested|testing|verified|validated|measured|monitored|deployed)\b/i,
        /\b(result|outcome|worked|resolved|improved|success|failure)\b/i,
      ],
      missingFeedback: "Explain how you tested or validated the solution.",
      partialFeedback: "Describe the outcome and how you verified it.",
      strongFeedback: "You explain the outcome and validation process.",
    },
  ],

  ROLE_RELEVANCE: [
    {
      id: "relevance",
      name: "Role relevance",
      weight: 30,
      description: "Connects the answer to the responsibilities of the role.",
      indicators: [
        /\b(role|position|responsibility|team|developer|engineer|project)\b/i,
        /\b(experience|worked|built|managed|delivered|contributed)\b/i,
      ],
      missingFeedback: "Connect your answer to the role you are applying for.",
      partialFeedback: "Explain how your experience relates to this position.",
      strongFeedback: "You connect your experience to the role.",
    },
    {
      id: "evidence",
      name: "Supporting evidence",
      weight: 30,
      description: "Provides a concrete example.",
      indicators: [
        /\b(project|example|experience|application|system|client|customer)\b/i,
        /\b(created|built|developed|implemented|managed|delivered|improved)\b/i,
      ],
      missingFeedback: "Support your answer with a real example.",
      partialFeedback: "Add specific details about your contribution.",
      strongFeedback: "You provide concrete evidence of your experience.",
    },
    {
      id: "contribution",
      name: "Personal contribution",
      weight: 25,
      description: "Makes the candidate's contribution clear.",
      indicators: [
        /\b(I|my)\b/i,
        /\b(designed|built|implemented|resolved|created|led|managed|tested)\b/i,
      ],
      missingFeedback: "Clarify what you personally contributed.",
      partialFeedback: "Distinguish your work from the team's contribution.",
      strongFeedback: "Your individual contribution is apparent.",
    },
    {
      id: "reflection",
      name: "Reflection",
      weight: 15,
      description: "Demonstrates learning and professional development.",
      indicators: [
        /\b(learned|improved|would change|next time|developed|realized|realised)\b/i,
        /\b(experience|feedback|mistake|lesson|growth)\b/i,
      ],
      missingFeedback: "Explain what you learned or how you would improve.",
      partialFeedback: "Add a specific lesson from this experience.",
      strongFeedback: "You demonstrate reflection and learning.",
    },
  ],

  COMPANY_ALIGNMENT: [
    {
      id: "motivation",
      name: "Motivation",
      weight: 25,
      description: "Explains the reason for applying.",
      indicators: [
        /\b(why|interested|excited|motivated|want to|would like)\b/i,
        /\b(company|organization|organisation|team|opportunity|product)\b/i,
      ],
      missingFeedback: "Explain why you are interested in this company.",
      partialFeedback: "Make your motivation more specific.",
      strongFeedback: "You communicate your motivation clearly.",
    },
    {
      id: "research",
      name: "Company understanding",
      weight: 30,
      description: "Shows awareness of the company's work.",
      indicators: [
        /\b(product|service|platform|customers|industry|mission|market)\b/i,
        /\b(company|organization|organisation|business|team)\b/i,
      ],
      missingFeedback: "Include something specific about the company.",
      partialFeedback:
        "Demonstrate a clearer understanding of its products or work.",
      strongFeedback: "You demonstrate awareness of the company's work.",
    },
    {
      id: "alignment",
      name: "Experience alignment",
      weight: 30,
      description: "Connects personal experience to the opportunity.",
      indicators: [
        /\b(experience|skills|background|knowledge|projects)\b/i,
        /\b(contribute|support|help|develop|build|deliver|improve)\b/i,
      ],
      missingFeedback: "Connect your skills and experience to the opportunity.",
      partialFeedback: "Explain how your experience could contribute.",
      strongFeedback: "You connect your background to the opportunity.",
    },
    {
      id: "contribution",
      name: "Potential contribution",
      weight: 15,
      description: "Explains how the candidate could contribute.",
      indicators: [
        /\b(contribute|bring|offer|support|help|improve|develop)\b/i,
        /\b(team|product|project|business|customers)\b/i,
      ],
      missingFeedback: "Explain what you could contribute to the company.",
      partialFeedback: "Make your potential contribution more specific.",
      strongFeedback: "You describe how you could contribute.",
    },
  ],
};
