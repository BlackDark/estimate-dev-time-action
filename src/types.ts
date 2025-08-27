export interface EstimationRequest {
  prChanges: string;
  skillLevels: SkillLevel[];
  model: string;
}

export interface EstimationResponse {
  estimations: {
    [K in SkillLevel]: {
      timeEstimate: string;
      reasoning: string;
      complexity: 'Low' | 'Medium' | 'High';
    };
  };
}

export type SkillLevel = 'Junior' | 'Senior' | 'Expert';

export interface ActionInputs {
  openrouterApiKey: string;
  model?: string;
  skillLevels?: string;
  ignorePatterns?: string;
}

export interface PrChanges {
  additions: number;
  deletions: number;
  changedFiles: number;
  diffContent: string;
}
