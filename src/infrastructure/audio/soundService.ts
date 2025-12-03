/**
 * Sound Service - Generate game sounds using Web Audio API
 * No external audio files needed!
 */

type SoundType =
  | "cardPlay"
  | "cardSelect"
  | "pass"
  | "win"
  | "lose"
  | "turnStart"
  | "gameStart"
  | "error"
  | "playerJoin"
  | "playerReady"
  | "countdown"
  | "click"
  | "bet"
  | "chip"
  | "deal"
  | "shuffle";

type BgmType = "waiting" | "game";
type GameBgmStyle = "adventure" | "battle" | "castle" | "tavern" | "tension";

class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;
  private bgmEnabled: boolean = true;
  private bgmVolume: number = 0.15;
  private bgmInterval: NodeJS.Timeout | null = null;
  private bgmPlaying: boolean = false;
  private currentBgmType: BgmType | null = null;
  private gameBgmStyle: GameBgmStyle = "tavern";

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  // BGM Controls
  setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBgm();
    }
  }

  setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
  }

  isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  isBgmPlaying(): boolean {
    return this.bgmPlaying;
  }

  setGameBgmStyle(style: GameBgmStyle) {
    this.gameBgmStyle = style;
    // If game BGM is playing, restart with new style
    if (this.bgmPlaying && this.currentBgmType === "game") {
      this.stopBgm();
      this.startBgm("game");
    }
  }

  getGameBgmStyle(): GameBgmStyle {
    return this.gameBgmStyle;
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType) {
    if (!this.enabled || typeof window === "undefined") return;

    try {
      const ctx = this.getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      switch (type) {
        case "cardPlay":
          this.playCardSound(ctx);
          break;
        case "cardSelect":
          this.playSelectSound(ctx);
          break;
        case "pass":
          this.playPassSound(ctx);
          break;
        case "win":
          this.playWinSound(ctx);
          break;
        case "lose":
          this.playLoseSound(ctx);
          break;
        case "turnStart":
          this.playTurnSound(ctx);
          break;
        case "gameStart":
          this.playGameStartSound(ctx);
          break;
        case "error":
          this.playErrorSound(ctx);
          break;
        case "playerJoin":
          this.playPlayerJoinSound(ctx);
          break;
        case "playerReady":
          this.playPlayerReadySound(ctx);
          break;
        case "countdown":
          this.playCountdownSound(ctx);
          break;
        case "click":
          this.playClickSound(ctx);
          break;
        case "bet":
          this.playBetSound(ctx);
          break;
        case "chip":
          this.playChipSound(ctx);
          break;
        case "deal":
          this.playDealSound(ctx);
          break;
        case "shuffle":
          this.playShuffleSound(ctx);
          break;
      }
    } catch (e) {
      console.warn("Sound play failed:", e);
    }
  }

  // Card play - snap/click sound
  private playCardSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(this.volume * 0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  // Card select - soft click
  private playSelectSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  }

  // Pass - whoosh sound
  private playPassSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  // Win - happy ascending melody
  private playWinSound(ctx: AudioContext) {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.12;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  // Lose - sad descending melody
  private playLoseSound(ctx: AudioContext) {
    const notes = [392, 349, 330, 262]; // G4, F4, E4, C4

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.2;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  // Turn start - notification ding
  private playTurnSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  // Game start - fanfare
  private playGameStartSound(ctx: AudioContext) {
    const notes = [262, 330, 392, 523]; // C4, E4, G4, C5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.08;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  // Error - buzz
  private playErrorSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(150, ctx.currentTime);

    gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  // Player join - welcome chime
  private playPlayerJoinSound(ctx: AudioContext) {
    const notes = [440, 554, 659]; // A4, C#5, E5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.1;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  // Player ready - confirmation sound
  private playPlayerReadySound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  // Countdown tick
  private playCountdownSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  }

  // Simple click
  private playClickSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  }

  // Bet sound - chip placing
  private playBetSound(ctx: AudioContext) {
    const notes = [300, 400, 500]; // Ascending quick notes

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.05;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(this.volume * 0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);

      osc.start(startTime);
      osc.stop(startTime + 0.08);
    });
  }

  // Chip sound - casino chip
  private playChipSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  // Deal sound - card dealing
  private playDealSound(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  // Shuffle sound - card shuffling
  private playShuffleSound(ctx: AudioContext) {
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startTime = ctx.currentTime + i * 0.05;
      const freq = 400 + Math.random() * 400;

      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(200, startTime + 0.03);

      gain.gain.setValueAtTime(this.volume * 0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.03);

      osc.start(startTime);
      osc.stop(startTime + 0.04);
    }
  }

  // Background music - ambient loop
  startBgm(type: BgmType = "waiting") {
    if (!this.bgmEnabled || typeof window === "undefined") return;

    // If already playing same type, do nothing
    if (this.bgmPlaying && this.currentBgmType === type) return;

    // Stop current BGM if switching types
    if (this.bgmPlaying) {
      this.stopBgm();
    }

    this.bgmPlaying = true;
    this.currentBgmType = type;

    if (type === "waiting") {
      this.playWaitingBgm();
    } else {
      this.playGameBgm();
    }
  }

  // Waiting room BGM - calm ambient
  private playWaitingBgm() {
    const playAmbientNote = () => {
      if (
        !this.bgmPlaying ||
        !this.bgmEnabled ||
        this.currentBgmType !== "waiting"
      )
        return;

      try {
        const ctx = this.getAudioContext();
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        // Soft ambient chord
        const notes = [130.81, 164.81, 196]; // C3, E3, G3
        const now = ctx.currentTime;

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(this.bgmVolume * 0.3, now + 0.5);
          gain.gain.linearRampToValueAtTime(this.bgmVolume * 0.2, now + 2);
          gain.gain.linearRampToValueAtTime(0, now + 3);

          osc.start(now + i * 0.05);
          osc.stop(now + 3);
        });
      } catch (e) {
        console.warn("Waiting BGM failed:", e);
      }
    };

    playAmbientNote();
    this.bgmInterval = setInterval(playAmbientNote, 4000);
  }

  // Game BGM - Dragon Quest inspired styles
  private playGameBgm() {
    switch (this.gameBgmStyle) {
      case "adventure":
        this.playAdventureBgm();
        break;
      case "battle":
        this.playBattleBgm();
        break;
      case "castle":
        this.playCastleBgm();
        break;
      case "tavern":
        this.playTavernBgm();
        break;
      case "tension":
        this.playTensionBgm();
        break;
    }
  }

  // Adventure BGM - Heroic overworld theme
  private playAdventureBgm() {
    let noteIndex = 0;
    const melody = [
      { note: 392, dur: 0.3 },
      { note: 440, dur: 0.15 },
      { note: 494, dur: 0.3 },
      { note: 523, dur: 0.45 },
      { note: 494, dur: 0.15 },
      { note: 440, dur: 0.3 },
      { note: 392, dur: 0.45 },
      { note: 330, dur: 0.3 },
    ];

    const playNote = () => {
      if (
        !this.bgmPlaying ||
        this.currentBgmType !== "game" ||
        this.gameBgmStyle !== "adventure"
      )
        return;

      try {
        const ctx = this.getAudioContext();
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;
        const { note, dur } = melody[noteIndex % melody.length];

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(this.bgmVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
        osc.start(now);
        osc.stop(now + dur);

        if (noteIndex % 2 === 0) {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bassOsc.type = "sine";
          bassOsc.connect(bassGain);
          bassGain.connect(ctx.destination);
          bassOsc.frequency.setValueAtTime(note / 2, now);
          bassGain.gain.setValueAtTime(this.bgmVolume * 0.2, now);
          bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          bassOsc.start(now);
          bassOsc.stop(now + 0.4);
        }

        noteIndex++;
      } catch (e) {
        console.warn("Adventure BGM failed:", e);
      }
    };

    playNote();
    this.bgmInterval = setInterval(playNote, 350);
  }

  // Battle BGM - Intense combat
  private playBattleBgm() {
    let beatIndex = 0;

    const playBeat = () => {
      if (
        !this.bgmPlaying ||
        this.currentBgmType !== "game" ||
        this.gameBgmStyle !== "battle"
      )
        return;

      try {
        const ctx = this.getAudioContext();
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;
        const bassPattern = [147, 147, 165, 147, 175, 165, 147, 131];
        const bass = bassPattern[beatIndex % bassPattern.length];

        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = "sawtooth";
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.frequency.setValueAtTime(bass, now);
        bassGain.gain.setValueAtTime(this.bgmVolume * 0.15, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        bassOsc.start(now);
        bassOsc.stop(now + 0.15);

        if (beatIndex % 2 === 1) {
          const melodyNotes = [587, 659, 698, 784];
          const mel =
            melodyNotes[Math.floor(beatIndex / 2) % melodyNotes.length];
          const melOsc = ctx.createOscillator();
          const melGain = ctx.createGain();
          melOsc.type = "square";
          melOsc.connect(melGain);
          melGain.connect(ctx.destination);
          melOsc.frequency.setValueAtTime(mel, now);
          melGain.gain.setValueAtTime(this.bgmVolume * 0.1, now);
          melGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          melOsc.start(now);
          melOsc.stop(now + 0.1);
        }

        beatIndex++;
      } catch (e) {
        console.warn("Battle BGM failed:", e);
      }
    };

    playBeat();
    this.bgmInterval = setInterval(playBeat, 180);
  }

  // Castle BGM - Royal/majestic
  private playCastleBgm() {
    let noteIndex = 0;
    const melody = [
      { notes: [262, 330, 392], dur: 0.6 },
      { notes: [294, 370, 440], dur: 0.6 },
      { notes: [330, 415, 494], dur: 0.6 },
      { notes: [349, 440, 523], dur: 0.9 },
      { notes: [330, 415, 494], dur: 0.6 },
      { notes: [294, 370, 440], dur: 0.6 },
      { notes: [262, 330, 392], dur: 0.9 },
    ];

    const playChord = () => {
      if (
        !this.bgmPlaying ||
        this.currentBgmType !== "game" ||
        this.gameBgmStyle !== "castle"
      )
        return;

      try {
        const ctx = this.getAudioContext();
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;
        const { notes, dur } = melody[noteIndex % melody.length];

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.connect(gain);
          gain.connect(ctx.destination);

          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(
            this.bgmVolume * 0.2,
            startTime + 0.1
          );
          gain.gain.linearRampToValueAtTime(
            this.bgmVolume * 0.15,
            startTime + dur * 0.5
          );
          gain.gain.linearRampToValueAtTime(0, startTime + dur);

          osc.start(startTime);
          osc.stop(startTime + dur);
        });

        noteIndex++;
      } catch (e) {
        console.warn("Castle BGM failed:", e);
      }
    };

    playChord();
    this.bgmInterval = setInterval(playChord, 700);
  }

  // Tavern BGM - Cheerful/relaxed (Card game style)
  private playTavernBgm() {
    let beatIndex = 0;
    const melody = [392, 440, 494, 523, 494, 440, 392, 330];

    const playBeat = () => {
      if (
        !this.bgmPlaying ||
        this.currentBgmType !== "game" ||
        this.gameBgmStyle !== "tavern"
      )
        return;

      try {
        const ctx = this.getAudioContext();
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;

        const bassNote = beatIndex % 2 === 0 ? 196 : 147;
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = "sine";
        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);
        bassOsc.frequency.setValueAtTime(bassNote, now);
        bassGain.gain.setValueAtTime(this.bgmVolume * 0.2, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);

        const mel = melody[beatIndex % melody.length];
        const melOsc = ctx.createOscillator();
        const melGain = ctx.createGain();
        melOsc.type = "triangle";
        melOsc.connect(melGain);
        melGain.connect(ctx.destination);
        melOsc.frequency.setValueAtTime(mel, now);
        melGain.gain.setValueAtTime(this.bgmVolume * 0.18, now);
        melGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        melOsc.start(now);
        melOsc.stop(now + 0.25);

        if (beatIndex % 4 === 0) {
          [294, 370, 440, 494].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, now + i * 0.03);
            gain.gain.setValueAtTime(this.bgmVolume * 0.1, now + i * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.03 + 0.15);
            osc.start(now + i * 0.03);
            osc.stop(now + i * 0.03 + 0.15);
          });
        }

        beatIndex++;
      } catch (e) {
        console.warn("Tavern BGM failed:", e);
      }
    };

    playBeat();
    this.bgmInterval = setInterval(playBeat, 280);
  }

  // Tension BGM - Suspenseful
  private playTensionBgm() {
    let beatIndex = 0;

    const playBeat = () => {
      if (
        !this.bgmPlaying ||
        this.currentBgmType !== "game" ||
        this.gameBgmStyle !== "tension"
      )
        return;

      try {
        const ctx = this.getAudioContext();
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;

        const droneFreq = 65 + Math.sin(beatIndex * 0.2) * 5;
        const droneOsc = ctx.createOscillator();
        const droneGain = ctx.createGain();
        droneOsc.type = "sine";
        droneOsc.connect(droneGain);
        droneGain.connect(ctx.destination);
        droneOsc.frequency.setValueAtTime(droneFreq, now);
        droneGain.gain.setValueAtTime(this.bgmVolume * 0.15, now);
        droneGain.gain.linearRampToValueAtTime(this.bgmVolume * 0.1, now + 0.8);
        droneOsc.start(now);
        droneOsc.stop(now + 0.8);

        if (beatIndex % 4 === 0 || beatIndex % 4 === 1) {
          const beatOsc = ctx.createOscillator();
          const beatGain = ctx.createGain();
          beatOsc.type = "sine";
          beatOsc.connect(beatGain);
          beatGain.connect(ctx.destination);
          beatOsc.frequency.setValueAtTime(55, now);
          const vol = beatIndex % 4 === 0 ? 0.25 : 0.15;
          beatGain.gain.setValueAtTime(this.bgmVolume * vol, now);
          beatGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          beatOsc.start(now);
          beatOsc.stop(now + 0.15);
        }

        beatIndex++;
      } catch (e) {
        console.warn("Tension BGM failed:", e);
      }
    };

    playBeat();
    this.bgmInterval = setInterval(playBeat, 400);
  }

  stopBgm() {
    this.bgmPlaying = false;
    this.currentBgmType = null;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  getCurrentBgmType(): BgmType | null {
    return this.currentBgmType;
  }

  toggleBgm(type?: BgmType) {
    if (this.bgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm(type || "waiting");
    }
    return this.bgmPlaying;
  }
}

// Singleton instance
export const soundService = new SoundService();
