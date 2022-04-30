interface Colors {
  tonal: string;
  fill: string;
  label: string;
}

interface PhraseValue {
  value: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
}

interface TemplatePhrase {
  id: string;
  placeholder: string;
}

type TemplateToken = string | TemplatePhrase;

interface TemplateLine {
  tokens: TemplateToken[];
}

interface Template {
  lines: TemplateLine[];
}

type OnboardingStep = 'reveal-type' | null;
