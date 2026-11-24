// Kaotic Chainz app kit: generated copy. Edit in app-portfolio/kit, then run scripts/sync-kit.sh.
//
// The KC Arcade mechanics. Each one turns a content pack into a short round and only talks to
// the shell through addScore / learn / end. New games are new packs, not new code.
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '../theme';
import { Body, Button, Card, Muted, Row, Stack, Strong } from '../ui';
import { answerPoints, guessPoints, overlap, rng, shuffled } from './engine';
import type { CatchPack, GuessPack, Mechanic, MemoryPack, OrderPack, QuizPack, SequencePack, SortPack, SpinnerPack, StackPack, WordPack } from './types';

export type MechanicProps<P> = {
  pack: P;
  seed: number;
  addScore: (n: number) => void;
  learn: (s: string) => void;
  end: () => void;
  /**
   * For games that end on a mistake (stack, sequence): offer a revive. The shell calls
   * `resume` if the person revives, or ends the round. Without a shell handler it just ends.
   */
  fail?: (resume: () => void) => void;
};

/** Mechanics without a countdown timer: they end when the player finishes. */
export const UNTIMED = new Set<Mechanic>(['spinner', 'sequence', 'memory', 'word']);

const FEEDBACK_MS = 900;

function Feedback({ ok, text }: { ok: boolean | null; text?: string }) {
  const { c } = useTheme();
  if (ok === null) return <View style={{ minHeight: 44 }} />;
  return (
    <View style={{ minHeight: 44 }} accessibilityLiveRegion="polite">
      <Strong style={{ color: ok ? c.success : c.danger }} testID="game-feedback">{ok ? 'Nice one!' : 'Not quite'}</Strong>
      {text ? <Muted>{text}</Muted> : null}
    </View>
  );
}

function Big({ children, testID }: { children: string; testID?: string }) {
  const { c, font } = useTheme();
  return (
    <Text testID={testID} style={{ fontFamily: font.display, fontSize: 24, lineHeight: 30, color: c.text, textAlign: 'center' }}>
      {children}
    </Text>
  );
}

// ---------- quiz: pick the right answer ----------

function Quiz({ pack, seed, addScore, learn, end }: MechanicProps<QuizPack>) {
  const items = useMemo(() => shuffled(pack.items, seed), [pack, seed]);
  const [i, setI] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; why?: string; pick: number } | null>(null);
  const item = items[i];
  const order = useMemo(() => (item ? shuffled(item.options.map((_, k) => k), seed + i) : []), [item, seed, i]);
  if (!item) return null;
  const pick = (k: number) => {
    if (fb) return;
    const ok = k === item.answer;
    addScore(answerPoints(ok, streak));
    setStreak(ok ? streak + 1 : 0);
    if (!ok && item.why) learn(item.why);
    setFb({ ok, why: item.why, pick: k });
    setTimeout(() => {
      setFb(null);
      if (i + 1 >= items.length) end();
      else setI(i + 1);
    }, ok ? FEEDBACK_MS / 2 : FEEDBACK_MS * 1.6);
  };
  return (
    <Stack gap={10}>
      <Card>
        <Big testID="quiz-q">{item.q}</Big>
      </Card>
      {order.map((k, n) => (
        <Button key={k} title={item.options[k]} variant={fb && k === item.answer ? 'primary' : fb && k === fb.pick ? 'danger' : 'secondary'} onPress={() => pick(k)} testID={`opt-${n}`} accessibilityLabel={item.options[k]} />
      ))}
      <Feedback ok={fb ? fb.ok : null} text={fb && !fb.ok ? fb.why : undefined} />
    </Stack>
  );
}

// ---------- sort: drop each item in the right bin ----------

function Sort({ pack, seed, addScore, learn, end }: MechanicProps<SortPack>) {
  const items = useMemo(() => shuffled(pack.items, seed), [pack, seed]);
  const [i, setI] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fb, setFb] = useState<{ ok: boolean; why?: string } | null>(null);
  const item = items[i];
  if (!item) return null;
  const pick = (bin: string) => {
    if (fb) return;
    const ok = bin === item.bin;
    addScore(answerPoints(ok, streak));
    setStreak(ok ? streak + 1 : 0);
    if (!ok && item.why) learn(item.why);
    setFb({ ok, why: item.why });
    setTimeout(() => {
      setFb(null);
      if (i + 1 >= items.length) end();
      else setI(i + 1);
    }, ok ? FEEDBACK_MS / 2 : FEEDBACK_MS * 1.6);
  };
  return (
    <Stack gap={10}>
      <Card>
        <Big testID="sort-item">{item.text}</Big>
      </Card>
      <Row gap={8} wrap>
        {pack.bins.map((b, n) => (
          <View key={b.id} style={{ flexGrow: 1, flexBasis: pack.bins.length > 2 ? '30%' : '45%' }}>
            <Button title={`${b.emoji ? `${b.emoji} ` : ''}${b.label}`} variant="secondary" onPress={() => pick(b.id)} testID={`bin-${n}`} />
          </View>
        ))}
      </Row>
      <Feedback ok={fb ? fb.ok : null} text={fb && !fb.ok ? fb.why : undefined} />
    </Stack>
  );
}

// ---------- catch: move the catcher, grab the good, dodge the bad ----------

type Faller = { id: number; x: number; y: number; good: boolean; e: string; label: string };
const FIELD_H = 300;

function Catch({ pack, seed, addScore, learn }: MechanicProps<CatchPack>) {
  const { c, radius } = useTheme();
  const [w, setW] = useState(300);
  const [px, setPx] = useState(150);
  const [items, setItems] = useState<Faller[]>([]);
  const st = useRef({ items: [] as Faller[], px: 150, w: 300, next: 0, r: rng(seed), t: 0 });
  useEffect(() => {
    const s = st.current;
    const id = setInterval(() => {
      s.t += 1;
      const speed = 4 + Math.min(6, s.t / 120);
      if (s.t % 22 === 0) {
        const good = s.r() < 0.65;
        const pool = good ? pack.good : pack.bad;
        const it = pool[Math.floor(s.r() * pool.length)];
        s.items.push({ id: s.next++, x: 20 + s.r() * (s.w - 40), y: -20, good, e: it.e, label: it.label });
      }
      const keep: Faller[] = [];
      for (const it of s.items) {
        it.y += speed;
        if (it.y > FIELD_H - 56 && it.y < FIELD_H - 20 && Math.abs(it.x - s.px) < 38) {
          addScore(it.good ? 5 : -3);
          if (!it.good) learn(`${it.e} ${it.label}: ${pack.tip}`);
          continue;
        }
        if (it.y < FIELD_H) keep.push(it);
      }
      s.items = keep;
      setItems([...keep]);
    }, 40);
    return () => clearInterval(id);
  }, [pack, addScore, learn]);
  const move = (x: number) => {
    const s = st.current;
    s.px = Math.max(20, Math.min(s.w - 20, x));
    setPx(s.px);
  };
  const onLayout = (e: LayoutChangeEvent) => {
    st.current.w = e.nativeEvent.layout.width;
    setW(e.nativeEvent.layout.width);
    move(e.nativeEvent.layout.width / 2);
  };
  return (
    <Stack gap={8}>
      <View
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => move(e.nativeEvent.locationX)}
        onResponderMove={(e) => move(e.nativeEvent.locationX)}
        accessibilityLabel={`Catch area. Catch ${pack.good.map((g) => g.label).join(', ')}. Avoid ${pack.bad.map((b) => b.label).join(', ')}.`}
        style={{ height: FIELD_H, backgroundColor: c.surfaceAlt, borderRadius: radius, overflow: 'hidden' }}
        testID="catch-field"
      >
        {items.map((it) => (
          <Text key={it.id} pointerEvents="none" style={{ position: 'absolute', left: it.x - 16, top: it.y, fontSize: 28 }}>
            {it.e}
          </Text>
        ))}
        <Text pointerEvents="none" style={{ position: 'absolute', left: px - 22, top: FIELD_H - 52, fontSize: 40 }}>
          {pack.catcher}
        </Text>
      </View>
      <Row gap={8}>
        <View style={{ flex: 1 }}>
          <Button title="◀ Left" variant="secondary" onPress={() => move(st.current.px - w / 5)} testID="catch-left" />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Right ▶" variant="secondary" onPress={() => move(st.current.px + w / 5)} testID="catch-right" />
        </View>
      </Row>
      <Muted center>{`Catch ${pack.good.map((g) => g.e).join(' ')} · dodge ${pack.bad.map((b) => b.e).join(' ')}`}</Muted>
    </Stack>
  );
}

// ---------- stack: drop each block on the tower ----------

function StackGame({ pack, addScore, learn, end, fail }: MechanicProps<StackPack>) {
  const { c, radius } = useTheme();
  const W = 280;
  const [tower, setTower] = useState<{ left: number; width: number }[]>([{ left: 70, width: 140 }]);
  const [pos, setPos] = useState(0);
  const dir = useRef(1);
  const posRef = useRef(0);
  const top = tower[tower.length - 1];
  useEffect(() => {
    const id = setInterval(() => {
      const speed = 5 + Math.min(8, tower.length * 0.6);
      let p = posRef.current + dir.current * speed;
      if (p < 0 || p > W - top.width) {
        dir.current *= -1;
        p = Math.max(0, Math.min(W - top.width, p));
      }
      posRef.current = p;
      setPos(p);
    }, 30);
    return () => clearInterval(id);
  }, [tower.length, top.width]);
  const drop = () => {
    const o = overlap(top.left, top.width, posRef.current, top.width);
    if (o.width < 6) {
      learn(pack.tip);
      // Revived: the tower stays as it was and the next block comes round again.
      if (fail) fail(() => {});
      else end();
      return;
    }
    addScore(o.width > top.width - 4 ? 15 : 10);
    setTower((t) => [...t, o]);
  };
  const shown = tower.slice(-9);
  return (
    <Stack gap={8}>
      <Pressable onPress={drop} accessibilityRole="button" accessibilityLabel={`Drop the ${pack.label}`} style={{ height: 300, backgroundColor: c.surfaceAlt, borderRadius: radius, overflow: 'hidden', alignItems: 'center' }}>
        <View style={{ width: W, height: 300 }}>
          <View style={{ position: 'absolute', top: 14, left: pos, width: top.width, height: 24, backgroundColor: c.accent, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{pack.block}</Text>
          </View>
          {shown.map((b, k) => (
            <View key={tower.length - shown.length + k} style={{ position: 'absolute', bottom: k * 26, left: b.left, width: b.width, height: 24, backgroundColor: c.primary, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text>{pack.block}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <Button title={`Drop the ${pack.label}`} onPress={drop} testID="stack-drop" />
      <Muted center>{`Tower: ${tower.length - 1}`}</Muted>
    </Stack>
  );
}

// ---------- memory: flip and match pairs ----------

function Memory({ pack, seed, addScore, end }: MechanicProps<MemoryPack>) {
  const { c, radius } = useTheme();
  const cards = useMemo(() => {
    const pairs = shuffled(pack.pairs, seed).slice(0, 6);
    return shuffled(
      pairs.flatMap(([a, b], k) => [
        { id: `${k}a`, pair: k, text: a },
        { id: `${k}b`, pair: k, text: b },
      ]),
      seed + 1,
    );
  }, [pack, seed]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const flip = (n: number) => {
    if (open.length === 2 || open.includes(n) || done.includes(cards[n].pair)) return;
    const next = [...open, n];
    setOpen(next);
    if (next.length === 2) {
      const match = cards[next[0]].pair === cards[next[1]].pair;
      setTimeout(() => {
        if (match) {
          addScore(15);
          const d = [...done, cards[n].pair];
          setDone(d);
          if (d.length * 2 === cards.length) end();
        }
        setOpen([]);
      }, match ? 300 : 800);
    }
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityLabel="Memory cards">
      {cards.map((card, n) => {
        const shown = open.includes(n) || done.includes(card.pair);
        return (
          <Pressable
            key={card.id}
            onPress={() => flip(n)}
            accessibilityRole="button"
            accessibilityLabel={shown ? card.text : `Card ${n + 1}, face down`}
            testID={`mem-${n}`}
            style={{ width: '31%', aspectRatio: 1, borderRadius: radius, backgroundColor: shown ? c.surface : c.primary, borderWidth: 2, borderColor: done.includes(card.pair) ? c.success : c.border, alignItems: 'center', justifyContent: 'center', padding: 4 }}
          >
            <Text style={{ fontSize: card.text.length <= 2 ? 34 : 13, textAlign: 'center', color: c.text, fontWeight: '700' }}>{shown ? card.text : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- sequence: watch, then repeat ----------

function Sequence({ pack, seed, addScore, learn, end, fail }: MechanicProps<SequencePack>) {
  const { c, radius } = useTheme();
  const r = useRef(rng(seed));
  const [seq, setSeq] = useState<number[]>(() => [Math.floor(r.current() * pack.symbols.length)]);
  const [showing, setShowing] = useState(true);
  const [lit, setLit] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    setShowing(true);
    let k = 0;
    const id = setInterval(() => {
      if (k >= seq.length * 2) {
        clearInterval(id);
        setLit(null);
        setShowing(false);
        setPos(0);
        return;
      }
      setLit(k % 2 === 0 ? seq[k / 2] : null);
      k++;
    }, 380);
    return () => clearInterval(id);
  }, [seq]);
  const press = (n: number) => {
    if (showing) return;
    if (n !== seq[pos]) {
      learn(pack.tip);
      // Revived: the same sequence plays again from the start.
      if (fail) fail(() => setSeq([...seq]));
      else end();
      return;
    }
    if (pos + 1 === seq.length) {
      addScore(seq.length * 5);
      setSeq([...seq, Math.floor(r.current() * pack.symbols.length)]);
    } else setPos(pos + 1);
  };
  return (
    <Stack gap={10}>
      <Strong center testID="seq-status">{showing ? 'Watch…' : `Your turn: ${pos + 1} of ${seq.length}`}</Strong>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {pack.symbols.map((s, n) => (
          <Pressable key={n} onPress={() => press(n)} accessibilityRole="button" accessibilityLabel={s} testID={`seq-${n}`} style={{ width: '30%', aspectRatio: 1, borderRadius: radius, alignItems: 'center', justifyContent: 'center', backgroundColor: lit === n ? c.accent : c.surfaceAlt, borderWidth: 3, borderColor: lit === n ? c.text : c.border }}>
            <Text style={{ fontSize: 40 }}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </Stack>
  );
}

// ---------- spinner: spin for a real-world prompt, then do it ----------

function Spinner({ pack, seed, addScore, end }: MechanicProps<SpinnerPack>) {
  const r = useRef(rng(seed));
  const [cur, setCur] = useState<SpinnerPack['prompts'][number] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(0);
  const spin = () => {
    setSpinning(true);
    let k = 0;
    const id = setInterval(() => {
      setCur(pack.prompts[Math.floor(r.current() * pack.prompts.length)]);
      if (++k > 10) {
        clearInterval(id);
        setSpinning(false);
      }
    }, 70);
  };
  return (
    <Stack gap={12}>
      <Card>
        {cur ? (
          <>
            {cur.tag ? <Muted center>{cur.tag}</Muted> : null}
            <Big testID="spin-prompt">{cur.text}</Big>
          </>
        ) : (
          <Big>Spin for a challenge!</Big>
        )}
      </Card>
      <Button title={cur ? 'Spin again' : 'Spin'} icon="sync" onPress={spin} disabled={spinning} testID="spin" />
      {cur && !spinning ? (
        <Button
          title={pack.done}
          variant="accent"
          testID="spin-done"
          onPress={() => {
            addScore(10);
            setDone(done + 1);
            setCur(null);
          }}
        />
      ) : null}
      {pack.note ? <Muted center>{pack.note}</Muted> : null}
      <Muted center>{`Done: ${done}`}</Muted>
      {done > 0 ? <Button title="Finish" variant="secondary" onPress={end} testID="spin-finish" /> : null}
    </Stack>
  );
}

// ---------- guess: how close can you get? ----------

function Guess({ pack, seed, addScore, learn, end }: MechanicProps<GuessPack>) {
  const items = useMemo(() => shuffled(pack.items, seed), [pack, seed]);
  const [i, setI] = useState(0);
  const item = items[i];
  const [val, setVal] = useState(() => (item ? Math.round((item.min + item.max) / 2 / item.step) * item.step : 0));
  const [fb, setFb] = useState<{ pts: number } | null>(null);
  if (!item) return null;
  const fmt = (n: number) => (item.unit === '£' ? `£${n.toLocaleString('en-GB')}` : `${n.toLocaleString('en-GB')} ${item.unit}`);
  const bump = (d: number) => setVal((v) => Math.max(item.min, Math.min(item.max, Math.round((v + d) / item.step) * item.step)));
  const lock = () => {
    const pts = guessPoints(val, item.answer);
    addScore(pts);
    if (item.why) learn(item.why);
    setFb({ pts });
  };
  const next = () => {
    setFb(null);
    if (i + 1 >= items.length) return end();
    const n = items[i + 1];
    setVal(Math.round((n.min + n.max) / 2 / n.step) * n.step);
    setI(i + 1);
  };
  return (
    <Stack gap={10}>
      <Card>
        <Big testID="guess-q">{item.q}</Big>
      </Card>
      <Big testID="guess-val">{fmt(val)}</Big>
      {fb ? (
        <>
          <Strong center testID="guess-answer">{`Answer: ${fmt(item.answer)} · +${fb.pts}`}</Strong>
          {item.why ? <Muted center>{item.why}</Muted> : null}
          <Button title="Next" onPress={next} testID="guess-next" />
        </>
      ) : (
        <>
          <Row gap={6} style={{ justifyContent: 'center' }}>
            {[-10, -1, 1, 10].map((m) => (
              <Button key={m} small variant="secondary" title={`${m > 0 ? '+' : '−'}${fmt(Math.abs(m) * item.step)}`} onPress={() => bump(m * item.step)} testID={`guess-${m}`} />
            ))}
          </Row>
          <Button title="Lock it in" onPress={lock} testID="guess-lock" />
        </>
      )}
    </Stack>
  );
}

// ---------- order: tap the steps in the right order ----------

function Order({ pack, seed, addScore, learn, end }: MechanicProps<OrderPack>) {
  const rounds = useMemo(() => shuffled(pack.rounds, seed), [pack, seed]);
  const [i, setI] = useState(0);
  const [got, setGot] = useState(0);
  const [miss, setMiss] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const round = rounds[i];
  const order = useMemo(() => (round ? shuffled(round.steps.map((_, k) => k), seed + i) : []), [round, seed, i]);
  if (!round) return null;
  const tapStep = (k: number) => {
    if (k < got) return;
    if (k !== got) {
      setMiss(miss + 1);
      setWrong(k);
      setTimeout(() => setWrong(null), 500);
      return;
    }
    if (got + 1 === round.steps.length) {
      addScore(Math.max(5, 30 - miss * 5));
      if (miss && round.why) learn(round.why);
      setGot(0);
      setMiss(0);
      if (i + 1 >= rounds.length) end();
      else setI(i + 1);
    } else setGot(got + 1);
  };
  return (
    <Stack gap={8}>
      <Strong center>{round.title}</Strong>
      <Muted center>Tap them in order, first to last.</Muted>
      {order.map((k) => (
        <Button key={k} title={k < got ? `${k + 1}. ${round.steps[k]}` : round.steps[k]} variant={k < got ? 'primary' : wrong === k ? 'danger' : 'secondary'} onPress={() => tapStep(k)} testID={`step-${k}`} />
      ))}
    </Stack>
  );
}

// ---------- word: guess the five-letter word ----------

const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function scoreGuess(guess: string, answer: string): ('hit' | 'near' | 'miss')[] {
  const out: ('hit' | 'near' | 'miss')[] = Array(guess.length).fill('miss');
  const left: Record<string, number> = {};
  for (let k = 0; k < answer.length; k++) {
    if (guess[k] === answer[k]) out[k] = 'hit';
    else left[answer[k]] = (left[answer[k]] ?? 0) + 1;
  }
  for (let k = 0; k < guess.length; k++) {
    if (out[k] !== 'hit' && left[guess[k]]) {
      out[k] = 'near';
      left[guess[k]]--;
    }
  }
  return out;
}

function Word({ pack, seed, addScore, learn, end }: MechanicProps<WordPack>) {
  const { c } = useTheme();
  const words = useMemo(() => shuffled(pack.words, seed), [pack, seed]);
  const [i, setI] = useState(0);
  const [rows, setRows] = useState<string[]>([]);
  const [cur, setCur] = useState('');
  const w = words[i];
  if (!w) return null;
  const answer = w.word.toUpperCase();
  const solved = rows.includes(answer);
  const out = !solved && rows.length >= 6;
  const enter = () => {
    if (cur.length !== answer.length) return;
    const r = [...rows, cur];
    setRows(r);
    setCur('');
    if (cur === answer) addScore((7 - r.length) * 10);
    else if (r.length >= 6) learn(`${answer}: ${w.clue}`);
  };
  const next = () => {
    setRows([]);
    if (i + 1 >= words.length) end();
    else setI(i + 1);
  };
  const colour = { hit: c.success, near: c.warning, miss: c.border };
  return (
    <Stack gap={8}>
      <Muted center>{`Clue: ${w.clue}`}</Muted>
      {[...rows, ...(solved || out ? [] : [cur.padEnd(answer.length, ' ')])].map((row, ri) => {
        const marks = ri < rows.length ? scoreGuess(row, answer) : null;
        return (
          <Row key={ri} gap={6} style={{ justifyContent: 'center' }}>
            {[...row].map((ch, k) => (
              <View key={k} style={{ width: 40, height: 40, borderRadius: 6, borderWidth: 2, borderColor: c.border, backgroundColor: marks ? colour[marks[k]] : c.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', fontSize: 18, color: marks && marks[k] !== 'miss' ? '#fff' : c.text }}>{ch}</Text>
              </View>
            ))}
          </Row>
        );
      })}
      {solved || out ? (
        <>
          <Strong center testID="word-result">{solved ? 'Got it!' : `It was ${answer}`}</Strong>
          <Button title="Next word" onPress={next} testID="word-next" />
        </>
      ) : (
        <>
          {KEYS.map((line) => (
            <Row key={line} gap={4} style={{ justifyContent: 'center' }}>
              {[...line].map((k) => (
                <Pressable key={k} onPress={() => setCur((s) => (s.length < answer.length ? s + k : s))} accessibilityRole="button" accessibilityLabel={k} testID={`key-${k}`} style={{ minWidth: 28, paddingVertical: 10, borderRadius: 6, backgroundColor: c.surfaceAlt, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', color: c.text }}>{k}</Text>
                </Pressable>
              ))}
            </Row>
          ))}
          <Row gap={8} style={{ justifyContent: 'center' }}>
            <Button small variant="secondary" title="Delete" onPress={() => setCur((s) => s.slice(0, -1))} testID="key-del" />
            <Button small title="Enter" onPress={enter} testID="key-enter" />
          </Row>
        </>
      )}
    </Stack>
  );
}

function RoutePlaceholder() {
  return <Body>This game opens in its own screen.</Body>;
}

export const MECHANICS: Record<Mechanic, ComponentType<MechanicProps<never>>> = {
  quiz: Quiz as ComponentType<MechanicProps<never>>,
  sort: Sort as ComponentType<MechanicProps<never>>,
  catch: Catch as ComponentType<MechanicProps<never>>,
  stack: StackGame as ComponentType<MechanicProps<never>>,
  memory: Memory as ComponentType<MechanicProps<never>>,
  sequence: Sequence as ComponentType<MechanicProps<never>>,
  spinner: Spinner as ComponentType<MechanicProps<never>>,
  guess: Guess as ComponentType<MechanicProps<never>>,
  order: Order as ComponentType<MechanicProps<never>>,
  word: Word as ComponentType<MechanicProps<never>>,
  route: RoutePlaceholder as ComponentType<MechanicProps<never>>,
};
