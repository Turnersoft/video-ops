export type BeatPosterNextLeadLang = 'en' | 'zh';

export type NextLeadBeat = {
  title: string;
  say: string;
  chinese: string;
};

function stripMathFences(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

/** Keep `inline code` markers for rich paragraph rendering. */
function stripParagraphMarkup(text: string): string {
  return text
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}

function normalizeTitleKey(title: string): string {
  return stripMathFences(title).trim();
}

function transitionKey(currentTitle: string, nextTitle: string): string {
  return `${normalizeTitleKey(currentTitle)}|${normalizeTitleKey(nextTitle)}`;
}

/** Hook questions keyed by current beat → next beat (avoid repeating the next title). */
const TRANSITION_QUESTION_EN: Record<string, string> = {
  'Textbook rule and how = is wired|What = asks us to prove':
    '`=` is wired in — so what does writing it ask us to prove?',
  'What = asks us to prove|When Lean can simplify for us':
    '`rfl` closed `1 = 1` — can it close `n + 0 = n` too?',
  'When Lean can simplify for us|When Lean needs a named fact':
    '`n + 0` unfolds for free — what about `0 + n`?',
  'When Lean needs a named fact|Equality needs matching kinds':
    'A named theorem patched addition — when may Lean compare two things at all?',
  'Equality needs matching kinds|Sets already use the same =':
    'Kinds match—so can sets use plain `=`?',
  'Sets already use the same =|What set equality embeds':
    'Same `=` symbol—what proof job is hiding inside?',
  'What set equality embeds|Functions are known by their answers':
    'Sets unpacked—do functions follow the same playbook?',
  'Functions are known by their answers|Turn-Lang lists the three checks':
    'Pointwise answers—what does Turn-Lang spell out?',
  'Turn-Lang lists the three checks|Same job does not mean same data':
    'Three checks pass—does that mean the data match?',
  'Same job does not mean same data|One question to take away':
    'Same job, different data—what should you remember?',
};

const TRANSITION_QUESTION_ZH: Record<string, string> = {
  'Textbook rule and how = is wired|What = asks us to prove':
    '等号接好了——写下它，到底要证明什么？',
  'What = asks us to prove|When Lean can simplify for us':
    '`rfl` 能证 `1 = 1`——`n + 0 = n` 也行吗？',
  'When Lean can simplify for us|When Lean needs a named fact':
    '`n + 0` 自动展开——那 `0 + n` 呢？',
  'When Lean needs a named fact|Equality needs matching kinds':
    '加法靠点名定理补上——那 Lean 什么时候才允许比较两个东西？',
  'Equality needs matching kinds|Sets already use the same =':
    '类型对上了——集合能直接写 `=` 吗？',
  'Sets already use the same =|What set equality embeds':
    '同一个 `=`，到底要证明什么？',
  'What set equality embeds|Functions are known by their answers':
    '集合拆完了——函数也用同一套规则吗？',
  'Functions are known by their answers|Turn-Lang lists the three checks':
    '逐点相等——Turn-Lang 写清了哪三步？',
  'Turn-Lang lists the three checks|Same job does not mean same data':
    '三步都过——数据就一定一样吗？',
  'Same job does not mean same data|One question to take away':
    '活一样、数据不同——该记住什么？',
};

const TITLE_QUESTION_EN: Record<string, string> = {
  'Textbook rule and how = is wired': 'How is `=` wired in the textbook rule?',
  'What = asks us to prove': 'What does `=` ask us to prove?',
  'When Lean can simplify for us': 'When can Lean simplify for us?',
  'When Lean needs a named fact': 'When does Lean need a named fact?',
  'Equality needs matching kinds': 'Why does equality need matching kinds?',
  'Sets already use the same =': 'Do sets already use the same `=`?',
  'What set equality embeds': 'Two subset checks—ready to unpack them?',
  'Functions are known by their answers': 'Are functions known by their answers?',
  'Turn-Lang lists the three checks': 'What three checks does Turn-Lang list?',
  'Same job does not mean same data': 'Does the same job mean the same data?',
  'One question to take away': 'What is the one question to take away?',
};

const TITLE_QUESTION_ZH: Record<string, string> = {
  'Textbook rule and how = is wired': '课本公式里，等号是怎么接线的？',
  'What = asks us to prove': '写下 `=` 后，Lean 到底要你证明什么？',
  'When Lean can simplify for us': '什么时候 Lean 能顺手化简？',
  'When Lean needs a named fact': '什么时候必须点名一条定理？',
  'Equality needs matching kinds': '为什么相等要先对同款对象？',
  'Sets already use the same =': '集合早就沿用了同一个 `=` 吗？',
  'What set equality embeds': '集合相等，真正塞进去了什么？',
  'Functions are known by their answers': '函数相等，看的是每个答案吗？',
  'Turn-Lang lists the three checks': 'Turn-Lang 把哪三件事写清楚了？',
  'Same job does not mean same data': '干同一件事，就等于同一份数据吗？',
  'One question to take away': '最后该带走哪个小问题？',
};

function titleToQuestionEn(titleMarkup: string): string {
  const key = normalizeTitleKey(titleMarkup);
  const mapped = TITLE_QUESTION_EN[key];
  if (mapped) {
    return mapped;
  }

  let t = titleMarkup.trim();
  if (t.endsWith('?')) {
    return t;
  }

  if (/^what\s+/i.test(t)) {
    const rest = t.slice(5);
    const restPlain = stripMathFences(rest);
    if (/asks us to prove$/i.test(restPlain)) {
      const subject = rest.replace(/\s*asks us to prove\s*$/i, '').trim();
      return `What does ${subject} ask us to prove?`;
    }
    if (/embeds$/i.test(restPlain)) {
      const subject = rest.replace(/\s*embeds\s*$/i, '').trim();
      return `What's packed inside ${subject}?`;
    }
    return `${t}?`;
  }

  if (/^when\s+/i.test(t)) {
    const rest = t.slice(5);
    if (/^(can|does|do|is|are|will|would|should)\b/i.test(stripMathFences(rest))) {
      return `${t}?`;
    }
    if (/^(\w+(?:\s+\w+)?)\s+(needs|requires)/i.test(stripMathFences(rest))) {
      return `When does ${rest}?`;
    }
    return `${t}?`;
  }

  if (/^(why|how|which|can|does|do|is|are)\b/i.test(t)) {
    return `${t}?`;
  }

  if (/does not mean|don't mean|do not mean/i.test(key)) {
    return `Does ${key.replace(/does not mean|don't mean|do not mean/i, 'mean')}?`;
  }
  if (/already use/i.test(key)) {
    return `Do ${key.charAt(0).toLowerCase()}${key.slice(1)}?`;
  }
  if (/are known by/i.test(key)) {
    return `Are ${key.charAt(0).toLowerCase()}${key.slice(1)}?`;
  }
  if (/\blists?\s/i.test(key)) {
    return `What does ${t.charAt(0).toLowerCase()}${t.slice(1).replace(/\blists\b/i, 'list')}?`;
  }
  if (/\bneeds\b/i.test(key)) {
    return `Why does ${t.charAt(0).toLowerCase()}${t.slice(1)}?`;
  }

  return `What about ${t.charAt(0).toLowerCase()}${t.slice(1)}?`;
}

function titleToQuestionZh(title: string, zhTitle?: string): string {
  const key = normalizeTitleKey(title);
  const mapped = TITLE_QUESTION_ZH[key];
  if (mapped) {
    return mapped;
  }

  if (zhTitle?.trim()) {
    const trimmed = zhTitle.trim();
    if (/[？?]$/.test(trimmed)) {
      return trimmed;
    }
    if (/什么|吗|呢|为何|怎么|何时|哪/.test(trimmed)) {
      return `${trimmed}？`;
    }
    return `${trimmed}？`;
  }

  return `下一篇：${stripMathFences(title)}？`;
}

export function buildNextLeadSentence(params: {
  currentBeat?: NextLeadBeat | null;
  nextBeat: NextLeadBeat | null | undefined;
  lang: BeatPosterNextLeadLang;
  zhTitle?: string;
}): string {
  const { currentBeat, nextBeat, lang, zhTitle } = params;
  if (!nextBeat) {
    return lang === 'zh'
      ? '想看完整系列？去 turn-lang.com。'
      : 'Want the full series? Visit turn-lang.com.';
  }

  if (currentBeat) {
    const transition = lang === 'zh'
      ? TRANSITION_QUESTION_ZH[transitionKey(currentBeat.title, nextBeat.title)]
      : TRANSITION_QUESTION_EN[transitionKey(currentBeat.title, nextBeat.title)];
    if (transition) {
      return transition;
    }
  }

  const titleMarkup = stripParagraphMarkup(nextBeat.title.trim());
  if (lang === 'zh') {
    return titleToQuestionZh(nextBeat.title, zhTitle);
  }
  return titleToQuestionEn(titleMarkup);
}
