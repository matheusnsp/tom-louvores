/*
 * TOM LOUVORES
 * Detector de tonalidade musical
 * Suporta maiores, menores, sustenidos e bemóis.
 */
(function (global) {
  "use strict";

  const SHARP = [
    "C","C#","D","D#","E","F",
    "F#","G","G#","A","A#","B"
  ];

  const FLAT = [
    "C","Db","D","Eb","E","F",
    "Gb","G","Ab","A","Bb","B"
  ];

  const NAT = {
    C:0, D:2, E:4, F:5, G:7, A:9, B:11
  };

  const MAJOR = [0,2,4,5,7,9,11];
  const MINOR = [0,2,3,5,7,8,10];

  function pc(note) {
    const m = /^([A-G])([#b]?)/.exec(note || "");
    if (!m) return null;

    return (
      NAT[m[1]] +
      (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) +
      12
    ) % 12;
  }

  function parseChord(token) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(token);
    if (!m) return null;

    const suffix = m[3];

    if (!/^(?:(?:m(?!aj)|min|maj|M|dim|aug|sus|add)|[0-9(#b+°ø/)]|$)/.test(suffix)) {
      return null;
    }

    const minor = /^(?:m(?!aj)|min)/.test(suffix);

    return {
      root: pc(m[1] + m[2]),
      minor,
      raw: token
    };
  }

  function chordsFromLine(line) {
    let raw = line.trim();

    if (!raw || /^\s*(?:\[|#|\/\/)/.test(raw)) {
      return [];
    }

    raw = raw.replace(
      /^(?:Intro|Introdução|Refrão|Verso|Ponte|Solo)\s*:\s*/i,
      ""
    );

    const tokens = raw
      .split(/\s+/)
      .map(t => t.replace(/^[|:(]+|[|:),.;]+$/g, ""))
      .filter(Boolean);

    if (!tokens.length || tokens.length > 24) {
      return [];
    }

    const chords = tokens.map(parseChord);

    if (chords.some(c => !c)) {
      return [];
    }

    return chords;
  }

  function explicitKey(text) {
    const m = String(text).match(
      /^\s*(?:tom(?:\s+original)?|tonalidade|key)\s*:\s*([A-G][#b]?m?)\s*$/im
    );

    return m ? m[1] : null;
  }

  function keyName(root, minor, spelling) {
    const names = spelling === "b" ? FLAT : SHARP;
    return names[root] + (minor ? "m" : "");
  }

  function detect(text, preferred = "auto") {
    const source = String(text || "");

    const declared = explicitKey(source);

    if (declared) {
      return {
        tom: declared,
        confianca: "informado",
        origem: "cabecalho",
        alternativas: []
      };
    }

    const chords = source
      .split(/\r?\n/)
      .flatMap(chordsFromLine);

    if (!chords.length) {
      return {
        tom: null,
        confianca: "insuficiente",
        origem: "acordes",
        alternativas: []
      };
    }

    const scores = [];

    for (let root = 0; root < 12; root++) {
      for (const minor of [false, true]) {
        const scale = minor ? MINOR : MAJOR;
        let score = 0;

        for (const ch of chords) {
          const relative = (ch.root - root + 12) % 12;
          const degree = scale.indexOf(relative);

          if (degree === -1) {
            score -= 2.5;
            continue;
          }

          score += 2;

          const expectedMinor = minor
            ? [false,true,false,true,true,false,false][degree]
            : [false,true,true,false,false,true,true][degree];

          if (!/(?:dim|°|ø|sus|aug|\+)/i.test(ch.raw)) {
            score += ch.minor === expectedMinor ? 1.6 : -1.2;
          }

          if (degree === 0) score += 1.4;
          if (degree === 4) score += 0.7;
        }

        const last = chords[chords.length - 1];

        if (last.root === root && last.minor === minor) {
          score += 2;
        }

        scores.push({ root, minor, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const second = scores[1];

    const difference = best.score - second.score;

    const spelling =
      preferred === "b" || preferred === "#"
        ? preferred
        : /[A-G]b/.test(source) && !/[A-G]#/.test(source)
          ? "b"
          : "#";

    return {
      tom: keyName(best.root, best.minor, spelling),

      confianca:
        chords.length < 4 || difference < 3
          ? "baixa"
          : difference < 7
            ? "media"
            : "alta",

      origem: "acordes",
      acordesAnalisados: chords.length,

      alternativas: scores.slice(1, 4).map(s => ({
        tom: keyName(s.root, s.minor, spelling),
        pontuacao: Number(s.score.toFixed(1))
      }))
    };
  }

  function formatKey(tom, spelling = "auto") {
    const m = /^([A-G][#b]?)(m?)$/.exec(tom || "");

    if (!m || spelling === "auto") {
      return tom;
    }

    const names = spelling === "b" ? FLAT : SHARP;

    return names[pc(m[1])] + m[2];
  }

  const api = Object.freeze({
    detect,
    formatKey,
    parseChord
  });

  global.CifrasTonalidades = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

})(typeof window !== "undefined" ? window : globalThis);
