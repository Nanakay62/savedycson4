/**
 * questions.js — Procedural question engine with Bible Learning Mode metadata.
 *
 * Every generated question carries structured metadata (testament, book/
 * reference, category, difficulty, tags, type) plus a short explanation
 * string, added centrally by enrichQuestion() so individual templates only
 * need to return the core text/choices/correct — metadata is derived, not
 * hand-authored per fact, which is what makes 150+ underlying facts usable
 * without manually tagging each one.
 *
 * Difficulty system: TEMPLATE_DIFFICULTY tags each template easy/medium/hard.
 * pickTemplateForEra() filters templates against either a manually-selected
 * Settings.data.questionDifficulty, or (when set to 'auto') an adaptive
 * difficulty derived from the player's current streak — easy under a 3
 * streak, medium from 3–7, hard from 8+.
 *
 * ERA SCOPING (unchanged from before): every template only surfaces facts
 * tagged era <= the player's current era, with a safe generateEraFallback()
 * chain so a thin era never leaks a later-era fact just because its own
 * pool ran dry.
 */

const RecentHistory = {
  seen: [],
  maxSize: 40,
  record(signature) {
    this.seen.push(signature);
    if (this.seen.length > this.maxSize) this.seen.shift();
  },
  isRecent(signature) {
    return this.seen.includes(signature);
  },
  freshPool(pool, keyFn) {
    const fresh = pool.filter(item => !this.isRecent(keyFn(item)));
    return fresh.length > 0 ? fresh : pool;
  }
};

/** Difficulty + category labels per template, used by the difficulty system
 *  and surfaced as question metadata. */
const TEMPLATE_DIFFICULTY = {
  generateBookAfter: 'easy', generateBookBefore: 'easy',
  generateRelationship: 'easy', generateIdentifyPerson: 'medium',
  generatePlaceEvent: 'easy', generateKingKingdom: 'easy',
  generateKingGoodEvil: 'medium', generateProphetType: 'medium',
  generateProphetFact: 'hard', generateMiraclePerformer: 'medium',
  generateMatchCharacterEvent: 'medium', generateParableLesson: 'medium',
  generateApostleFact: 'medium', generateVerseBook: 'hard',
  generateCompleteVerse: 'hard', generateTestament: 'medium',
  generateMilestoneOrderTF: 'medium', generateWhichHappenedFirst: 'medium'
};
const TEMPLATE_CATEGORY = {
  generateBookAfter: 'Books', generateBookBefore: 'Books',
  generateRelationship: 'Relationships', generateIdentifyPerson: 'Identify the Person',
  generatePlaceEvent: 'Places', generateKingKingdom: 'Kings',
  generateKingGoodEvil: 'Kings', generateProphetType: 'Prophets',
  generateProphetFact: 'Prophets', generateMiraclePerformer: 'Miracles',
  generateMatchCharacterEvent: 'Match Character to Event', generateParableLesson: 'Parables',
  generateApostleFact: 'Disciples', generateVerseBook: 'Verses',
  generateCompleteVerse: 'Complete the Verse', generateTestament: 'Testaments',
  generateMilestoneOrderTF: 'Which Happened First', generateWhichHappenedFirst: 'Which Happened First'
};

const QuestionEngine = {
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  byEraUpTo(pool, era) { return pool.filter(item => item.era <= era); },

  eraScopedOrFull(fullPool, era, minNeeded) {
    if (!era) return fullPool;
    const scoped = fullPool.filter(item => item.era <= era);
    return scoped.length >= minNeeded ? scoped : fullPool;
  },

  generateEraFallback(era) {
    if (this.byEraUpTo(RELATIONSHIPS, era).length >= 4) return this.generateRelationship(era);
    if (this.byEraUpTo(PLACES, era).length >= 4) return this.generatePlaceEvent(era);
    if (this.byEraUpTo(MIRACLES, era).length >= 4) return this.generateMiraclePerformer(era);
    if (this.byEraUpTo(ERA_MILESTONES, era).length >= 2) return this.generateMilestoneOrderTF(era);
    return this.generateBookAfter(era);
  },

  // ---------------- Book-based templates ----------------

  generateBookAfter(era) {
    let valid = BIBLE_BOOKS.filter(b => b.order < 66 && (!era || b.era <= era));
    if (valid.length < 1) valid = BIBLE_BOOKS.filter(b => b.order < 66);
    const base = this.pick(RecentHistory.freshPool(valid, b => 'bookAfter:' + b.name));
    const next = BIBLE_BOOKS.find(b => b.order === base.order + 1);
    const distractorPool = this.eraScopedOrFull(BIBLE_BOOKS.filter(b => b.name !== next.name), era, 3);
    const distractors = this.shuffle(distractorPool).slice(0, 3);
    const choices = this.shuffle([next.name, ...distractors.map(d => d.name)]);
    RecentHistory.record('bookAfter:' + base.name);
    return {
      text: `Which book comes immediately AFTER ${base.name}?`, choices, correct: choices.indexOf(next.name),
      reference: null, explanation: `${next.name} directly follows ${base.name} in the canonical order of Scripture.`
    };
  },

  generateBookBefore(era) {
    let valid = BIBLE_BOOKS.filter(b => b.order > 1 && (!era || b.era <= era));
    if (valid.length < 1) valid = BIBLE_BOOKS.filter(b => b.order > 1);
    const base = this.pick(RecentHistory.freshPool(valid, b => 'bookBefore:' + b.name));
    const prev = BIBLE_BOOKS.find(b => b.order === base.order - 1);
    const distractorPool = this.eraScopedOrFull(BIBLE_BOOKS.filter(b => b.name !== prev.name), era, 3);
    const distractors = this.shuffle(distractorPool).slice(0, 3);
    const choices = this.shuffle([prev.name, ...distractors.map(d => d.name)]);
    RecentHistory.record('bookBefore:' + base.name);
    return {
      text: `Which book comes immediately BEFORE ${base.name}?`, choices, correct: choices.indexOf(prev.name),
      reference: null, explanation: `${prev.name} directly precedes ${base.name} in the canonical order of Scripture.`
    };
  },

  generateTestament(era) {
    const currTest = era <= 4 ? 'Old' : 'New';
    const oppTest = currTest === 'Old' ? 'New' : 'Old';
    let majPool = BIBLE_BOOKS.filter(b => b.testament === currTest && b.era <= era);
    if (majPool.length < 3) majPool = BIBLE_BOOKS.filter(b => b.testament === currTest);
    const maj = this.shuffle(majPool).slice(0, 3);
    let minPool = BIBLE_BOOKS.filter(b => b.testament === oppTest && b.era <= era);
    if (minPool.length < 1) minPool = BIBLE_BOOKS.filter(b => b.testament === oppTest);
    const min = this.pick(minPool);
    const choices = this.shuffle([...maj.map(b => b.name), min.name]);
    const text = currTest === 'Old'
      ? "Three of these are Old Testament books. Which one does NOT belong?"
      : "Three of these are New Testament books. Which one does NOT belong?";
    return {
      text, choices, correct: choices.indexOf(min.name),
      reference: null, explanation: `${min.name} belongs to the ${oppTest} Testament, unlike the other three options.`
    };
  },

  generateVerseBook(era) {
    const pool = VERSE_FRAGMENTS.filter(v => {
      const book = BIBLE_BOOKS.find(b => b.name === v.book);
      return book && book.era <= era;
    });
    if (pool.length < 4) return this.generateEraFallback(era);
    const base = this.pick(RecentHistory.freshPool(pool, v => 'verse:' + v.book));
    const distractorBookPool = BIBLE_BOOKS.filter(b => b.name !== base.book && b.era <= era);
    const distractorBooks = this.shuffle(distractorBookPool.length >= 3 ? distractorBookPool : BIBLE_BOOKS.filter(b => b.name !== base.book)).slice(0, 3);
    const choices = this.shuffle([base.book, ...distractorBooks.map(b => b.name)]);
    RecentHistory.record('verse:' + base.book);
    return {
      text: `Which book is this verse from? "${base.frag}"`, choices, correct: choices.indexOf(base.book),
      reference: base.ref || base.book, explanation: `This line is found in the book of ${base.book}.`
    };
  },

  generateCompleteVerse(era) {
    const pool = VERSE_FRAGMENTS.filter(v => {
      const book = BIBLE_BOOKS.find(b => b.name === v.book);
      return book && book.era <= era;
    });
    if (pool.length < 4) return this.generateEraFallback(era);
    const base = this.pick(RecentHistory.freshPool(pool, v => 'completeVerse:' + v.frag));
    const words = base.frag.replace(/[.,;:!?"']/g, '').split(' ');
    const candidates = words.map((w, i) => ({ w, i })).filter(o => o.w.length >= 4);
    const target = this.pick(candidates.length ? candidates : words.map((w, i) => ({ w, i })));
    const correctWord = words[target.i];
    const blanked = base.frag.split(' ').map((w, i) => i === target.i ? '_____' : w).join(' ');
    const distractorPool = [...new Set(
      VERSE_FRAGMENTS.flatMap(v => v.frag.replace(/[.,;:!?"']/g, '').split(' '))
        .filter(w => w.length >= 4 && w.toLowerCase() !== correctWord.toLowerCase())
    )];
    const distractors = this.shuffle(distractorPool).slice(0, 3);
    const choices = this.shuffle([correctWord, ...distractors]);
    RecentHistory.record('completeVerse:' + base.frag);
    return {
      text: `Complete the verse: "${blanked}"`, choices, correct: choices.indexOf(correctWord),
      type: 'complete_verse', reference: base.ref || base.book,
      explanation: `The full line reads: "${base.frag}" — found in ${base.book}.`
    };
  },

  // ---------------- Relationship / genealogy ----------------

generateRelationship(era) {
    const pool = this.byEraUpTo(RELATIONSHIPS, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const pair = this.pick(RecentHistory.freshPool(pool, p => 'rel:' + p.subject));
    let uniqueObjects = [...new Set(RELATIONSHIPS.filter(p => p.object !== pair.object).map(p => p.object))];
    const eraScoped = [...new Set(this.eraScopedOrFull(RELATIONSHIPS.filter(p => p.object !== pair.object), era, 3).map(p => p.object))];
    if (eraScoped.length >= 3) uniqueObjects = eraScoped;
    const distractors = this.shuffle(uniqueObjects).slice(0, 3);
    const choices = this.shuffle([pair.object, ...distractors]);
    RecentHistory.record('rel:' + pair.subject);
    return {
      text: `${pair.subject} was famously the ${pair.relation} of whom?`, choices, correct: choices.indexOf(pair.object),
      reference: pair.ref || ERA_BOOK_FALLBACK[era - 1], explanation: `${pair.subject} is identified in Scripture as the ${pair.relation} of ${pair.object}.`
    };
  },

 generateIdentifyPerson(era) {
    const pool = this.byEraUpTo(RELATIONSHIPS, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const pair = this.pick(RecentHistory.freshPool(pool, p => 'identify:' + p.subject));
    let uniqueSubjects = [...new Set(RELATIONSHIPS.filter(p => p.subject !== pair.subject).map(p => p.subject))];
    const eraScoped = [...new Set(this.eraScopedOrFull(RELATIONSHIPS.filter(p => p.subject !== pair.subject), era, 3).map(p => p.subject))];
    if (eraScoped.length >= 3) uniqueSubjects = eraScoped;
    const distractors = this.shuffle(uniqueSubjects).slice(0, 3);
    const choices = this.shuffle([pair.subject, ...distractors]);
    RecentHistory.record('identify:' + pair.subject);
    return {
      text: `Identify the person: the ${pair.relation} of ${pair.object}.`, choices, correct: choices.indexOf(pair.subject),
      type: 'identify', reference: pair.ref || ERA_BOOK_FALLBACK[era - 1],
      explanation: `${pair.subject} is the ${pair.relation} of ${pair.object}.`
    };
  },

  // ---------------- Kings ----------------

  generateKingKingdom(era) {
    const pool = this.byEraUpTo(KINGS, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const king = this.pick(RecentHistory.freshPool(pool, k => 'kingdom:' + k.name));
    const options = this.shuffle(['United Kingdom', 'Israel', 'Judah']);
    RecentHistory.record('kingdom:' + king.name);
    return {
      text: `${king.name} was a king of which kingdom?`, choices: options, correct: options.indexOf(king.kingdom),
      reference: king.ref || ERA_BOOK_FALLBACK[era - 1], explanation: `${king.name} reigned over the kingdom of ${king.kingdom}.`
    };
  },

  generateKingGoodEvil(era) {
    const pool = this.byEraUpTo(KINGS, era).filter(k => k.goodKing !== null);
    if (pool.length < 2) return this.generateKingKingdom(era);
    const king = this.pick(RecentHistory.freshPool(pool, k => 'goodevil:' + k.name));
    const statement = Math.random() < 0.5;
    RecentHistory.record('goodevil:' + king.name);
    const claimedLabel = statement ? 'did what was right in the eyes of the Lord' : 'did evil in the eyes of the Lord';
    const truth = king.goodKing ? 'did what was right in the eyes of the Lord' : 'did evil in the eyes of the Lord';
    return {
      text: `True or False: ${king.name} ${claimedLabel}.`, choices: ['True', 'False'],
      correct: (statement === king.goodKing) ? 0 : 1, reference: king.ref || ERA_BOOK_FALLBACK[era - 1],
      explanation: `Scripture records that ${king.name} ${truth}.`
    };
  },

  // ---------------- Prophets ----------------

  generateProphetType(era) {
    const pool = this.byEraUpTo(PROPHETS, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const prophet = this.pick(RecentHistory.freshPool(pool, p => 'prophetType:' + p.name));
    const options = this.shuffle(['major', 'minor', 'non-writing']);
    RecentHistory.record('prophetType:' + prophet.name);
    const label = { major: 'a major writing prophet', minor: 'a minor writing prophet', 'non-writing': 'a non-writing prophet' };
    const choices = options.map(o => label[o]);
    return {
      text: `How is ${prophet.name} best classified?`, choices, correct: options.indexOf(prophet.type),
      reference: prophet.ref || ERA_BOOK_FALLBACK[era - 1], explanation: `${prophet.name} is classified as ${label[prophet.type]}.`
    };
  },

  generateProphetFact(era) {
    const pool = this.byEraUpTo(PROPHETS, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const prophet = this.pick(RecentHistory.freshPool(pool, p => 'prophetFact:' + p.name));
    const distractors = this.shuffle(pool.filter(p => p.name !== prophet.name)).slice(0, 3);
    const choices = this.shuffle([prophet.name, ...distractors.map(d => d.name)]);
    RecentHistory.record('prophetFact:' + prophet.name);
    return {
      text: `Which prophet ${prophet.note}?`, choices, correct: choices.indexOf(prophet.name),
      reference: prophet.ref || ERA_BOOK_FALLBACK[era - 1], explanation: `${prophet.name} ${prophet.note}.`
    };
  },

  // ---------------- Miracles ----------------

  generateMiraclePerformer(era) {
    const pool = this.byEraUpTo(MIRACLES, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const miracle = this.pick(RecentHistory.freshPool(pool, m => 'miracle:' + m.desc));
    let uniquePerformers = [...new Set(pool.filter(m => m.performer !== miracle.performer).map(m => m.performer))];
    if (uniquePerformers.length < 3) {
      uniquePerformers = [...new Set(MIRACLES.filter(m => m.performer !== miracle.performer).map(m => m.performer))];
    }
    const distractors = this.shuffle(uniquePerformers).slice(0, 3);
    const choices = this.shuffle([miracle.performer, ...distractors]);
    RecentHistory.record('miracle:' + miracle.desc);
    return {
      text: `Who performed this miracle: ${miracle.desc}?`, choices, correct: choices.indexOf(miracle.performer),
      reference: miracle.ref || miracle.book, explanation: `${miracle.performer} is credited with ${miracle.desc.charAt(0).toLowerCase()}${miracle.desc.slice(1)}, recorded in ${miracle.book}.`
    };
  },

  generateMatchCharacterEvent(era) {
    const pool = this.byEraUpTo(MIRACLES, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const fact = this.pick(RecentHistory.freshPool(pool, m => 'match:' + m.desc));
    const distractors = this.shuffle(pool.filter(m => m.desc !== fact.desc)).slice(0, 3).map(m => m.desc);
    const choices = this.shuffle([fact.desc, ...distractors]);
    RecentHistory.record('match:' + fact.desc);
    return {
      text: `Which of these is something ${fact.performer} did?`, choices, correct: choices.indexOf(fact.desc),
      type: 'match', reference: fact.ref || fact.book,
      explanation: `${fact.performer} ${fact.desc.charAt(0).toLowerCase()}${fact.desc.slice(1)}, as recorded in ${fact.book}.`
    };
  },

  // ---------------- Parables ----------------

  generateParableLesson(era) {
    if (era < 5) return this.generateEraFallback(era);
    const pool = PARABLES;
    const parable = this.pick(RecentHistory.freshPool(pool, p => 'parable:' + p.title));
    const distractors = this.shuffle(pool.filter(p => p.title !== parable.title)).slice(0, 3).map(p => p.lesson);
    const choices = this.shuffle([parable.lesson, ...distractors]);
    RecentHistory.record('parable:' + parable.title);
    return {
      text: `What is the main lesson of the Parable of ${parable.title}?`, choices, correct: choices.indexOf(parable.lesson),
      reference: parable.ref || parable.book, explanation: `The Parable of ${parable.title} (${parable.book}) teaches ${parable.lesson}.`
    };
  },

  // ---------------- Apostles ----------------

  generateApostleFact(era) {
    if (era < 5) return this.generateEraFallback(era);
    const pool = APOSTLES;
    const apostle = this.pick(RecentHistory.freshPool(pool, a => 'apostle:' + a.name));
    const distractors = this.shuffle(pool.filter(a => a.name !== apostle.name)).slice(0, 3);
    const choices = this.shuffle([apostle.name, ...distractors.map(d => d.name)]);
    RecentHistory.record('apostle:' + apostle.name);
    return {
      text: `Which apostle ${apostle.fact}?`, choices, correct: choices.indexOf(apostle.name),
      reference: apostle.ref || ERA_BOOK_FALLBACK[era - 1], explanation: `${apostle.name} ${apostle.fact}.`
    };
  },

  // ---------------- Places ----------------

  generatePlaceEvent(era) {
    const pool = this.byEraUpTo(PLACES, era);
    if (pool.length < 4) return this.generateEraFallback(era);
    const place = this.pick(RecentHistory.freshPool(pool, p => 'place:' + p.name));
    const distractors = this.shuffle(pool.filter(p => p.name !== place.name)).slice(0, 3).map(p => p.name);
    const choices = this.shuffle([place.name, ...distractors]);
    RecentHistory.record('place:' + place.name);
    return {
      text: `Which place is ${place.event}?`, choices, correct: choices.indexOf(place.name),
      reference: place.ref || ERA_BOOK_FALLBACK[era - 1], explanation: `${place.name} is ${place.event}.`
    };
  },

  // ---------------- Timeline templates ----------------

  generateMilestoneOrderTF(era) {
    const pool = this.byEraUpTo(ERA_MILESTONES, era).filter(m => m.era === era || era === 7);
    const usable = pool.length >= 2 ? pool : ERA_MILESTONES.filter(m => m.era <= era);
    if (usable.length < 2) return this.generateRelationship(era);
    const sorted = [...usable].sort((a, b) => (a.era - b.era) || (a.order - b.order));
    const pairs = [];
    for (let i = 0; i < sorted.length - 1; i++) pairs.push([sorted[i], sorted[i + 1]]);
    const freshPairs = RecentHistory.freshPool(pairs, p => 'milestoneTF:' + p[0].event + '>' + p[1].event);
    const [a, b] = this.pick(freshPairs);
    RecentHistory.record('milestoneTF:' + a.event + '>' + b.event);
    const presentInOrder = Math.random() < 0.5;
    const first = presentInOrder ? a : b;
    const second = presentInOrder ? b : a;
    return {
      text: `True or False: "${first.event}" happened before "${second.event}".`, choices: ['True', 'False'],
      correct: presentInOrder ? 0 : 1, reference: (first.ref || ERA_BOOK_FALLBACK[era - 1]),
      explanation: `In the biblical timeline, "${a.event}" comes before "${b.event}".`
    };
  },

  generateWhichHappenedFirst(era) {
    const pool = this.byEraUpTo(ERA_MILESTONES, era).filter(m => m.era === era || era === 7);
    const usable = pool.length >= 3 ? pool : ERA_MILESTONES.filter(m => m.era <= era);
    if (usable.length < 3) return this.generateEraFallback(era);
    const picks = this.shuffle(usable).slice(0, 3).sort((a, b) => (a.era - b.era) || (a.order - b.order));
    const earliest = picks[0];
    const choices = this.shuffle(picks.map(p => p.event));
    RecentHistory.record('happenedFirst:' + picks.map(p => p.event).join('>'));
    return {
      text: 'Which of these happened FIRST?', choices, correct: choices.indexOf(earliest.event),
      type: 'order', reference: (earliest.ref || ERA_BOOK_FALLBACK[era - 1]),
      explanation: `"${earliest.event}" comes earliest among these events in the biblical timeline.`
    };
  },

  // ---------------- Difficulty system ----------------

  difficultyAllowed(templateDiff, effective) {
    if (effective === 'easy') return templateDiff === 'easy';
    if (effective === 'medium') return templateDiff === 'easy' || templateDiff === 'medium';
    return true; // 'hard' allows everything, including easy/medium (keeps variety)
  },

  /** Manual override via Settings.data.questionDifficulty ('easy'|'medium'|'hard'),
   *  or adaptive progression from the player's current streak when set to 'auto':
   *  Easy under a 3-streak, Medium from 3–7, Hard from 8+. */
  adaptiveDifficulty(streak) {
    if (streak >= 8) return 'hard';
    if (streak >= 3) return 'medium';
    return 'easy';
  },

  // ---------------- Template selection with progressive difficulty ----------------

  pickTemplateForEra(era, streak) {
    const diffSetting = (typeof Settings !== 'undefined' && Settings.data.questionDifficulty) || 'auto';
    const effective = diffSetting === 'auto' ? this.adaptiveDifficulty(streak || 0) : diffSetting;

    const weighted = [
      { fn: 'generateBookAfter',          w: era === 1 ? 0 : (era <= 2 ? 5 : 2) },
      { fn: 'generateBookBefore',         w: era === 1 ? 0 : (era <= 2 ? 4 : 2) },
      { fn: 'generateTestament',          w: era >= 5 ? (era <= 6 ? 3 : 2) : 0 },
      { fn: 'generateRelationship',       w: 3 },
      { fn: 'generateIdentifyPerson',     w: 3 },
      { fn: 'generateKingKingdom',        w: era >= 3 ? 3 : 0 },
      { fn: 'generateKingGoodEvil',       w: era >= 3 ? 3 : 0 },
      { fn: 'generateProphetType',        w: era >= 4 ? 3 : 0 },
      { fn: 'generateProphetFact',        w: era >= 4 ? 3 : 0 },
      { fn: 'generateMiraclePerformer',   w: 3 },
      { fn: 'generateMatchCharacterEvent',w: 3 },
      { fn: 'generateParableLesson',      w: era >= 5 ? 4 : 0 },
      { fn: 'generateApostleFact',        w: era >= 5 ? 3 : 0 },
      { fn: 'generatePlaceEvent',         w: 3 },
      { fn: 'generateVerseBook',          w: era >= 3 ? 2 : 0 },
      { fn: 'generateCompleteVerse',      w: era >= 3 ? 3 : 0 },
      { fn: 'generateMilestoneOrderTF',   w: 2 },
      { fn: 'generateWhichHappenedFirst', w: 2 }
    ].filter(t => t.w > 0 && this.difficultyAllowed(TEMPLATE_DIFFICULTY[t.fn] || 'medium', effective));

    // At medium/hard, bias weight toward templates matching the effective difficulty so the
    // curve actually *feels* like it's progressing, rather than just unlocking availability.
    const boosted = weighted.map(t => {
      const d = TEMPLATE_DIFFICULTY[t.fn] || 'medium';
      let mult = 1;
      if (effective === 'medium' && d === 'medium') mult = 1.6;
      if (effective === 'hard') { if (d === 'hard') mult = 2.2; else if (d === 'medium') mult = 1.4; else mult = 0.6; }
      return { fn: t.fn, w: t.w * mult };
    });

    const pool = boosted.length ? boosted : [{ fn: 'generateRelationship', w: 1 }];
    const total = pool.reduce((sum, t) => sum + t.w, 0);
    let roll = Math.random() * total;
    for (const t of pool) {
      if (roll < t.w) return t.fn;
      roll -= t.w;
    }
    return 'generateRelationship';
  },

  /** Fills in any metadata a template didn't set explicitly, so every question
   *  — regardless of which of the 18 templates produced it — carries a full,
   *  consistent metadata set for Bible Learning Mode and the Achievements/
   *  stats systems to use. */
  enrichQuestion(q, fnName, era) {
    q.category = q.category || TEMPLATE_CATEGORY[fnName] || 'General';
    q.difficulty = q.difficulty || TEMPLATE_DIFFICULTY[fnName] || 'medium';
    q.testament = q.testament || ERA_TESTAMENT[era - 1] || 'Old';
    q.type = q.type || (q.choices.length === 2 && q.choices.includes('True') ? 'true_false' : 'multiple_choice');
    q.reference = q.reference || ERA_BOOK_FALLBACK[era - 1] || '';
    q.explanation = q.explanation || 'This question checks your knowledge of this part of the biblical story.';
    q.tags = (q.tags && q.tags.length) ? q.tags : inferTags(q.text + ' ' + q.explanation);
    return q;
  },

  generateQuestion(era, streak) {
    const fnName = this.pickTemplateForEra(era, streak);
    const q = this[fnName](era);
    return this.enrichQuestion(q, fnName, era);
  },

  generateStronghold(era) {
    let pool = ERA_MILESTONES.filter(m => m.era === era);
    if (pool.length < 4) pool = BIBLE_BOOKS.filter(b => b.era === era).map(b => ({ event: b.name, order: b.order }));
    const items = this.shuffle(pool).slice(0, 4);
    const correctOrder = [...items].sort((a, b) => a.order - b.order).map(i => i.event);
    return {
      display: this.shuffle(items.map(i => i.event)), correctOrder,
      reference: ERA_BOOK_FALLBACK[era - 1],
      explanation: `These events belong to this era's timeline: ${correctOrder.join(' → ')}.`
    };
  }
};
