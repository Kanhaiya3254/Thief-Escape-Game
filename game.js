/* =========================================================
   THIEF ESCAPE
   HARD SECURITY VERSION
   Plain JavaScript - No external libraries

   FEATURES:
   - Multi-direction guard movement
   - Smart guard alert rotation
   - Strict body-edge vision detection
   - Multiple hiding spots
   - Coins / Key / Diamond / Exit
   - 30 second timer
   - Keyboard + Mouse + Touch
   - Lightweight Web Audio sound effects
   - 10 Levels
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       ELEMENTS
       ===================================================== */

    const gameBoard = document.getElementById("gameBoard");

    const player = document.getElementById("player");
    const guard = document.getElementById("guard");
    const guardVision = document.getElementById("guardVision");

    const key = document.getElementById("key");
    const diamond = document.getElementById("diamond");
    const exit = document.getElementById("exit");

    const levelText = document.getElementById("levelText");
    const coinText = document.getElementById("coinText");
    const timerText = document.getElementById("timerText");
    const progressBar = document.getElementById("progressBar");

    const safeMessage = document.getElementById("safeMessage");
    const instructionIcon = document.getElementById("instructionIcon");
    const instructionText = document.getElementById("instructionText");

    const startScreen = document.getElementById("startScreen");
    const successScreen = document.getElementById("successScreen");
    const gameOverScreen = document.getElementById("gameOverScreen");
    const ctaScreen = document.getElementById("ctaScreen");

    const startButton = document.getElementById("startButton");
    const nextButton = document.getElementById("nextButton");
    const retryButton = document.getElementById("retryButton");
    const playNowButton = document.getElementById("playNowButton");

    const timeBonus = document.getElementById("timeBonus");

    /* =====================================================
       EXISTING OBSTACLES
       ===================================================== */

    const obstacles = Array.from(
        document.querySelectorAll(".obstacle")
    );

    /* =====================================================
       SAFETY CHECK
       ===================================================== */

    if (
        !gameBoard ||
        !player ||
        !guard ||
        !guardVision ||
        !key ||
        !diamond ||
        !exit ||
        !startButton
    ) {
        console.error(
            "Thief Escape: Required HTML elements are missing."
        );

        return;
    }

    /* =====================================================
       GAME VARIABLES
       ===================================================== */

    let level = 1;

    let coinsCount = 0;

    let timeLeft = 30;

    let gameRunning = false;

    let gameOver = false;

    let timerInterval = null;

    let guardInterval = null;

    let animationFrame = null;

    let dragging = false;

    let playerX = 0;
    let playerY = 0;

    let guardX = 0;
    let guardY = 0;

    let guardTargetX = 0;
    let guardTargetY = 0;

    let guardAngle = 0;

    let guardSpeed = 0.13;

    let collectedKey = false;

    let collectedDiamond = false;

    let collectedCoins = new Set();

    let wasHidden = false;

    let alertCooldown = false;

    let audioContext = null;

    /* =====================================================
       HARD SECURITY SETTINGS
       ===================================================== */

    const NORMAL_VISION_DISTANCE = 40;

    const ALERT_VISION_DISTANCE = 46;

    const NORMAL_VISION_ANGLE = 40;

    const ALERT_VISION_ANGLE = 58;

    const GUARD_ALERT_DISTANCE = 27;

    const GUARD_EMERGENCY_DISTANCE = 16;

    const GUARD_NORMAL_TURN_SPEED = 0.12;

    const GUARD_ALERT_TURN_SPEED = 0.32;

    const GUARD_EMERGENCY_TURN_SPEED = 0.55;

    let guardAlertMode = false;

    /* =====================================================
       AUDIO SYSTEM
       ===================================================== */

    function initAudio() {

        if (!audioContext) {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (AudioContext) {

                try {

                    audioContext =
                        new AudioContext();

                } catch (error) {

                    console.warn(
                        "Audio could not be initialized.",
                        error
                    );

                }
            }
        }

        if (
            audioContext &&
            audioContext.state === "suspended"
        ) {

            audioContext.resume().catch(() => {});
        }
    }

    function playTone(
        frequency,
        duration = 0.12,
        type = "sine",
        volume = 0.04,
        delay = 0
    ) {

        if (!audioContext) {
            return;
        }

        try {

            const oscillator =
                audioContext.createOscillator();

            const gain =
                audioContext.createGain();

            const startTime =
                audioContext.currentTime + delay;

            const endTime =
                startTime + duration;

            oscillator.type = type;

            oscillator.frequency.setValueAtTime(
                frequency,
                startTime
            );

            gain.gain.setValueAtTime(
                0.0001,
                startTime
            );

            gain.gain.exponentialRampToValueAtTime(
                volume,
                startTime + 0.01
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                endTime
            );

            oscillator.connect(gain);

            gain.connect(
                audioContext.destination
            );

            oscillator.start(startTime);

            oscillator.stop(
                endTime + 0.02
            );

        } catch (error) {

            console.warn(
                "Sound effect error:",
                error
            );
        }
    }

    function playClickSound() {

        initAudio();

        playTone(
            650,
            0.07,
            "square",
            0.025
        );

        playTone(
            850,
            0.06,
            "square",
            0.018,
            0.04
        );
    }

    function playCoinSound() {

        initAudio();

        playTone(
            900,
            0.08,
            "sine",
            0.035
        );

        playTone(
            1300,
            0.12,
            "sine",
            0.035,
            0.07
        );
    }

    function playKeySound() {

        initAudio();

        playTone(
            500,
            0.08,
            "triangle",
            0.04
        );

        playTone(
            750,
            0.12,
            "triangle",
            0.045,
            0.08
        );

        playTone(
            1050,
            0.15,
            "triangle",
            0.04,
            0.16
        );
    }

    function playDiamondSound() {

        initAudio();

        playTone(
            700,
            0.12,
            "sine",
            0.04
        );

        playTone(
            900,
            0.12,
            "sine",
            0.04,
            0.08
        );

        playTone(
            1200,
            0.18,
            "sine",
            0.05,
            0.16
        );

        playTone(
            1500,
            0.22,
            "sine",
            0.035,
            0.26
        );
    }

    function playHideSound() {

        initAudio();

        playTone(
            300,
            0.12,
            "sine",
            0.025
        );

        playTone(
            220,
            0.16,
            "sine",
            0.018,
            0.08
        );
    }

    function playAlertSound() {

        if (alertCooldown) {
            return;
        }

        alertCooldown = true;

        initAudio();

        playTone(
            520,
            0.12,
            "sawtooth",
            0.045
        );

        playTone(
            360,
            0.12,
            "sawtooth",
            0.04,
            0.14
        );

        playTone(
            520,
            0.12,
            "sawtooth",
            0.04,
            0.28
        );

        setTimeout(() => {

            alertCooldown = false;

        }, 500);
    }

    function playGameOverSound() {

        initAudio();

        playTone(
            400,
            0.18,
            "sawtooth",
            0.05
        );

        playTone(
            300,
            0.22,
            "sawtooth",
            0.045,
            0.16
        );

        playTone(
            180,
            0.35,
            "sawtooth",
            0.04,
            0.35
        );
    }

    function playSuccessSound() {

        initAudio();

        playTone(
            600,
            0.12,
            "triangle",
            0.04
        );

        playTone(
            800,
            0.12,
            "triangle",
            0.04,
            0.1
        );

        playTone(
            1000,
            0.15,
            "triangle",
            0.04,
            0.2
        );

        playTone(
            1300,
            0.25,
            "triangle",
            0.05,
            0.32
        );
    }

    /* =====================================================
       10 LEVEL DATA
       ===================================================== */

    const levels = {

        /* =================================================
           LEVEL 1
           ================================================= */

        1: {

            player: {
                x: 42,
                y: 78
            },

            guard: {
                x: 65,
                y: 20,
                speed: 0.13
            },

            key: {
                x: 18,
                y: 35
            },

            diamond: {
                x: 67,
                y: 54
            },

            exit: {
                x: 78,
                y: 25
            },

            coins: [
                {
                    x: 35,
                    y: 62
                },
                {
                    x: 72,
                    y: 78
                }
            ],

            guardPath: [

                {
                    x: 70,
                    y: 20
                },

                {
                    x: 82,
                    y: 40
                },

                {
                    x: 72,
                    y: 62
                },

                {
                    x: 48,
                    y: 58
                },

                {
                    x: 25,
                    y: 65
                },

                {
                    x: 18,
                    y: 42
                },

                {
                    x: 25,
                    y: 22
                },

                {
                    x: 50,
                    y: 15
                }
            ]
        },

        /* =================================================
           LEVEL 2
           ================================================= */

        2: {

            player: {
                x: 12,
                y: 78
            },

            guard: {
                x: 52,
                y: 18,
                speed: 0.145
            },

            key: {
                x: 83,
                y: 42
            },

            diamond: {
                x: 49,
                y: 66
            },

            exit: {
                x: 82,
                y: 20
            },

            coins: [
                {
                    x: 22,
                    y: 38
                },

                {
                    x: 63,
                    y: 34
                }
            ],

            guardPath: [

                {
                    x: 20,
                    y: 22
                },

                {
                    x: 48,
                    y: 18
                },

                {
                    x: 78,
                    y: 22
                },

                {
                    x: 84,
                    y: 45
                },

                {
                    x: 72,
                    y: 70
                },

                {
                    x: 45,
                    y: 72
                },

                {
                    x: 22,
                    y: 60
                },

                {
                    x: 15,
                    y: 40
                }
            ]
        },

        /* =================================================
           LEVEL 3
           ================================================= */

        3: {

            player: {
                x: 10,
                y: 75
            },

            guard: {
                x: 65,
                y: 20,
                speed: 0.16
            },

            key: {
                x: 34,
                y: 28
            },

            diamond: {
                x: 76,
                y: 57
            },

            exit: {
                x: 84,
                y: 77
            },

            coins: [
                {
                    x: 50,
                    y: 25
                },

                {
                    x: 70,
                    y: 40
                }
            ],

            guardPath: [

                {
                    x: 70,
                    y: 18
                },

                {
                    x: 86,
                    y: 28
                },

                {
                    x: 80,
                    y: 50
                },

                {
                    x: 87,
                    y: 72
                },

                {
                    x: 62,
                    y: 78
                },

                {
                    x: 40,
                    y: 68
                },

                {
                    x: 25,
                    y: 50
                },

                {
                    x: 32,
                    y: 30
                },

                {
                    x: 52,
                    y: 18
                }
            ]
        },

        /* =================================================
           LEVEL 4
           ================================================= */

        4: {

            player: {
                x: 88,
                y: 82
            },

            guard: {
                x: 15,
                y: 18,
                speed: 0.175
            },

            key: {
                x: 28,
                y: 68
            },

            diamond: {
                x: 72,
                y: 38
            },

            exit: {
                x: 12,
                y: 22
            },

            coins: [
                {
                    x: 48,
                    y: 72
                },

                {
                    x: 68,
                    y: 22
                }
            ],

            guardPath: [

                {
                    x: 18,
                    y: 18
                },

                {
                    x: 48,
                    y: 16
                },

                {
                    x: 78,
                    y: 20
                },

                {
                    x: 86,
                    y: 42
                },

                {
                    x: 72,
                    y: 62
                },

                {
                    x: 50,
                    y: 78
                },

                {
                    x: 25,
                    y: 68
                },

                {
                    x: 14,
                    y: 45
                }
            ]
        },

        /* =================================================
           LEVEL 5
           ================================================= */

        5: {

            player: {
                x: 12,
                y: 84
            },

            guard: {
                x: 82,
                y: 18,
                speed: 0.19
            },

            key: {
                x: 68,
                y: 72
            },

            diamond: {
                x: 30,
                y: 42
            },

            exit: {
                x: 86,
                y: 25
            },

            coins: [
                {
                    x: 42,
                    y: 22
                },

                {
                    x: 62,
                    y: 54
                }
            ],

            guardPath: [

                {
                    x: 82,
                    y: 18
                },

                {
                    x: 88,
                    y: 40
                },

                {
                    x: 78,
                    y: 62
                },

                {
                    x: 58,
                    y: 76
                },

                {
                    x: 32,
                    y: 80
                },

                {
                    x: 16,
                    y: 62
                },

                {
                    x: 20,
                    y: 38
                },

                {
                    x: 40,
                    y: 20
                },

                {
                    x: 62,
                    y: 14
                }
            ]
        },

        /* =================================================
           LEVEL 6
           ================================================= */

        6: {

            player: {
                x: 86,
                y: 78
            },

            guard: {
                x: 18,
                y: 76,
                speed: 0.20
            },

            key: {
                x: 20,
                y: 24
            },

            diamond: {
                x: 76,
                y: 50
            },

            exit: {
                x: 48,
                y: 14
            },

            coins: [
                {
                    x: 36,
                    y: 38
                },

                {
                    x: 68,
                    y: 76
                }
            ],

            guardPath: [

                {
                    x: 18,
                    y: 76
                },

                {
                    x: 15,
                    y: 50
                },

                {
                    x: 22,
                    y: 25
                },

                {
                    x: 45,
                    y: 18
                },

                {
                    x: 72,
                    y: 24
                },

                {
                    x: 84,
                    y: 45
                },

                {
                    x: 78,
                    y: 70
                },

                {
                    x: 52,
                    y: 82
                },

                {
                    x: 30,
                    y: 68
                }
            ]
        },

        /* =================================================
           LEVEL 7
           ================================================= */

        7: {

            player: {
                x: 10,
                y: 18
            },

            guard: {
                x: 86,
                y: 78,
                speed: 0.215
            },

            key: {
                x: 52,
                y: 28
            },

            diamond: {
                x: 24,
                y: 70
            },

            exit: {
                x: 88,
                y: 18
            },

            coins: [
                {
                    x: 38,
                    y: 55
                },

                {
                    x: 70,
                    y: 42
                }
            ],

            guardPath: [

                {
                    x: 86,
                    y: 78
                },

                {
                    x: 64,
                    y: 82
                },

                {
                    x: 42,
                    y: 72
                },

                {
                    x: 20,
                    y: 78
                },

                {
                    x: 12,
                    y: 55
                },

                {
                    x: 22,
                    y: 32
                },

                {
                    x: 45,
                    y: 22
                },

                {
                    x: 70,
                    y: 26
                },

                {
                    x: 88,
                    y: 45
                }
            ]
        },

        /* =================================================
           LEVEL 8
           ================================================= */

        8: {

            player: {
                x: 90,
                y: 86
            },

            guard: {
                x: 10,
                y: 18,
                speed: 0.23
            },

            key: {
                x: 70,
                y: 30
            },

            diamond: {
                x: 36,
                y: 62
            },

            exit: {
                x: 14,
                y: 18
            },

            coins: [
                {
                    x: 58,
                    y: 68
                },

                {
                    x: 78,
                    y: 55
                }
            ],

            guardPath: [

                {
                    x: 12,
                    y: 18
                },

                {
                    x: 38,
                    y: 14
                },

                {
                    x: 66,
                    y: 18
                },

                {
                    x: 88,
                    y: 30
                },

                {
                    x: 82,
                    y: 52
                },

                {
                    x: 88,
                    y: 74
                },

                {
                    x: 62,
                    y: 84
                },

                {
                    x: 38,
                    y: 76
                },

                {
                    x: 16,
                    y: 62
                },

                {
                    x: 10,
                    y: 40
                }
            ]
        },

        /* =================================================
           LEVEL 9
           ================================================= */

        9: {

            player: {
                x: 8,
                y: 86
            },

            guard: {
                x: 88,
                y: 14,
                speed: 0.245
            },

            key: {
                x: 42,
                y: 22
            },

            diamond: {
                x: 78,
                y: 68
            },

            exit: {
                x: 84,
                y: 18
            },

            coins: [
                {
                    x: 25,
                    y: 52
                },

                {
                    x: 58,
                    y: 38
                }
            ],

            guardPath: [

                {
                    x: 88,
                    y: 14
                },

                {
                    x: 70,
                    y: 28
                },

                {
                    x: 88,
                    y: 48
                },

                {
                    x: 70,
                    y: 68
                },

                {
                    x: 52,
                    y: 82
                },

                {
                    x: 28,
                    y: 76
                },

                {
                    x: 12,
                    y: 58
                },

                {
                    x: 28,
                    y: 38
                },

                {
                    x: 48,
                    y: 24
                }
            ]
        },

        /* =================================================
           LEVEL 10 - FINAL HEIST
           ================================================= */

        10: {

            player: {
                x: 8,
                y: 86
            },

            guard: {
                x: 90,
                y: 12,
                speed: 0.265
            },

            key: {
                x: 18,
                y: 24
            },

            diamond: {
                x: 76,
                y: 72
            },

            exit: {
                x: 88,
                y: 14
            },

            coins: [
                {
                    x: 48,
                    y: 22
                },

                {
                    x: 62,
                    y: 52
                }
            ],

            guardPath: [

                {
                    x: 90,
                    y: 12
                },

                {
                    x: 68,
                    y: 16
                },

                {
                    x: 48,
                    y: 12
                },

                {
                    x: 25,
                    y: 20
                },

                {
                    x: 12,
                    y: 40
                },

                {
                    x: 20,
                    y: 62
                },

                {
                    x: 38,
                    y: 82
                },

                {
                    x: 62,
                    y: 86
                },

                {
                    x: 82,
                    y: 72
                },

                {
                    x: 88,
                    y: 48
                },

                {
                    x: 72,
                    y: 32
                }
            ]
        }
    };

    let currentGuardPath = [];

    let guardTargetIndex = 0;

    let extraHidingSpots = [];

    /* =====================================================
       EXTRA HIDING SPOTS
       ===================================================== */

    function createExtraHidingSpots() {

        extraHidingSpots.forEach(
            element => element.remove()
        );

        extraHidingSpots = [];

        const positions = {

            1: [
                {
                    left: "28%",
                    top: "43%",
                    width: "78px",
                    height: "42px"
                },

                {
                    left: "61%",
                    top: "33%",
                    width: "58px",
                    height: "48px"
                },

                {
                    left: "30%",
                    top: "70%",
                    width: "72px",
                    height: "38px"
                }
            ],

            2: [
                {
                    left: "25%",
                    top: "28%",
                    width: "62px",
                    height: "45px"
                },

                {
                    left: "55%",
                    top: "44%",
                    width: "80px",
                    height: "40px"
                },

                {
                    left: "35%",
                    top: "76%",
                    width: "65px",
                    height: "38px"
                }
            ],

            3: [
                {
                    left: "17%",
                    top: "42%",
                    width: "70px",
                    height: "44px"
                },

                {
                    left: "48%",
                    top: "35%",
                    width: "65px",
                    height: "45px"
                },

                {
                    left: "58%",
                    top: "73%",
                    width: "75px",
                    height: "40px"
                }
            ],

            4: [
                {
                    left: "22%",
                    top: "52%",
                    width: "72px",
                    height: "42px"
                },

                {
                    left: "55%",
                    top: "28%",
                    width: "62px",
                    height: "48px"
                },

                {
                    left: "70%",
                    top: "62%",
                    width: "70px",
                    height: "40px"
                }
            ],

            5: [
                {
                    left: "20%",
                    top: "35%",
                    width: "65px",
                    height: "42px"
                },

                {
                    left: "45%",
                    top: "58%",
                    width: "78px",
                    height: "40px"
                },

                {
                    left: "68%",
                    top: "34%",
                    width: "60px",
                    height: "44px"
                }
            ],

            6: [
                {
                    left: "24%",
                    top: "22%",
                    width: "70px",
                    height: "40px"
                },

                {
                    left: "48%",
                    top: "46%",
                    width: "65px",
                    height: "48px"
                },

                {
                    left: "68%",
                    top: "68%",
                    width: "72px",
                    height: "38px"
                }
            ],

            7: [
                {
                    left: "18%",
                    top: "34%",
                    width: "68px",
                    height: "42px"
                },

                {
                    left: "42%",
                    top: "62%",
                    width: "74px",
                    height: "40px"
                },

                {
                    left: "70%",
                    top: "28%",
                    width: "62px",
                    height: "46px"
                }
            ],

            8: [
                {
                    left: "24%",
                    top: "62%",
                    width: "64px",
                    height: "42px"
                },

                {
                    left: "50%",
                    top: "30%",
                    width: "72px",
                    height: "40px"
                },

                {
                    left: "72%",
                    top: "58%",
                    width: "60px",
                    height: "48px"
                }
            ],

            9: [
                {
                    left: "16%",
                    top: "48%",
                    width: "68px",
                    height: "40px"
                },

                {
                    left: "44%",
                    top: "24%",
                    width: "64px",
                    height: "46px"
                },

                {
                    left: "62%",
                    top: "70%",
                    width: "76px",
                    height: "38px"
                }
            ],

            10: [
                {
                    left: "20%",
                    top: "30%",
                    width: "58px",
                    height: "40px"
                },

                {
                    left: "46%",
                    top: "52%",
                    width: "66px",
                    height: "42px"
                },

                {
                    left: "72%",
                    top: "36%",
                    width: "58px",
                    height: "44px"
                }
            ]
        };

        const spots =
            positions[level] ||
            positions[1];

        spots.forEach(spot => {

            const cover =
                document.createElement("div");

            cover.className =
                "extra-cover";

            cover.style.position =
                "absolute";

            cover.style.left =
                spot.left;

            cover.style.top =
                spot.top;

            cover.style.width =
                spot.width;

            cover.style.height =
                spot.height;

            cover.style.zIndex =
                "12";

            cover.style.borderRadius =
                "8px";

            cover.style.background =
                "linear-gradient(145deg,#34394a,#181c2a)";

            cover.style.border =
                "2px solid rgba(255,255,255,.08)";

            cover.style.boxShadow =
                "0 8px 18px rgba(0,0,0,.35)";

            cover.dataset.cover =
                "true";

            gameBoard.appendChild(
                cover
            );

            extraHidingSpots.push(
                cover
            );
        });
    }

    /* =====================================================
       UTILITY
       ===================================================== */

    function clamp(value, min, max) {

        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function distance(
        x1,
        y1,
        x2,
        y2
    ) {

        const dx =
            x1 - x2;

        const dy =
            y1 - y2;

        return Math.sqrt(
            dx * dx +
            dy * dy
        );
    }

    function setPosition(
        element,
        x,
        y
    ) {

        if (!element) {
            return;
        }

        element.style.left =
            `${x}%`;

        element.style.top =
            `${y}%`;
    }

    function hideAllScreens() {

        [
            startScreen,
            successScreen,
            gameOverScreen,
            ctaScreen
        ].forEach(screen => {

            if (screen) {

                screen.classList.remove(
                    "active"
                );
            }
        });
    }

    function showScreen(screen) {

        if (!screen) {
            return;
        }

        hideAllScreens();

        screen.classList.add(
            "active"
        );
    }

    function clearIntervals() {

        if (timerInterval !== null) {

            clearInterval(
                timerInterval
            );

            timerInterval = null;
        }

        if (guardInterval !== null) {

            clearInterval(
                guardInterval
            );

            guardInterval = null;
        }
    }

    /* =====================================================
       PLAYER
       ===================================================== */

    function setPlayerPosition(
        x,
        y
    ) {

        playerX =
            clamp(
                x,
                4,
                92
            );

        playerY =
            clamp(
                y,
                6,
                88
            );

        setPosition(
            player,
            playerX,
            playerY
        );

        updateSafeStatus();

        checkCollectibles();

        checkExit();
    }

    /* =====================================================
       GUARD PATH
       ===================================================== */

    function setupGuardPath() {

        const data =
            levels[level];

        if (!data) {
            return;
        }

        currentGuardPath =
            Array.isArray(
                data.guardPath
            )
                ? data.guardPath
                : [];

        guardTargetIndex = 0;

        guardX =
            data.guard.x;

        guardY =
            data.guard.y;

        guardSpeed =
            data.guard.speed || 0.13;

        guardAlertMode = false;

        if (
            currentGuardPath.length > 0
        ) {

            guardTargetX =
                currentGuardPath[0].x;

            guardTargetY =
                currentGuardPath[0].y;

        } else {

            guardTargetX =
                guardX;

            guardTargetY =
                guardY;
        }
    }

    /* =====================================================
       ANGLE HELPERS
       ===================================================== */

    function normalizeAngle(angle) {

        while (angle > 180) {

            angle -= 360;
        }

        while (angle < -180) {

            angle += 360;
        }

        return angle;
    }

    function rotateTowards(
        current,
        target,
        amount
    ) {

        const difference =
            normalizeAngle(
                target - current
            );

        if (
            Math.abs(difference) <= amount
        ) {

            return target;
        }

        return (
            current +
            Math.sign(difference) *
            amount
        );
    }

    /* =====================================================
       GUARD ALERT SYSTEM
       ===================================================== */

    function updateGuardAlert() {

        if (!gameRunning || gameOver) {

            guardAlertMode = false;

            return;
        }

        if (isBehindObstacle()) {

            guardAlertMode = false;

            return;
        }

        const dist =
            distance(
                playerX,
                playerY,
                guardX,
                guardY
            );

        if (
            dist <= GUARD_ALERT_DISTANCE
        ) {

            guardAlertMode = true;

            const dx =
                playerX -
                guardX;

            const dy =
                playerY -
                guardY;

            const targetAngle =
                Math.atan2(
                    dy,
                    dx
                ) *
                180 /
                Math.PI;

            let turnSpeed =
                GUARD_ALERT_TURN_SPEED;

            if (
                dist <=
                GUARD_EMERGENCY_DISTANCE
            ) {

                turnSpeed =
                    GUARD_EMERGENCY_TURN_SPEED;
            }

            guardAngle =
                rotateTowards(
                    guardAngle,
                    targetAngle,
                    turnSpeed
                );

            if (
                dist <=
                GUARD_EMERGENCY_DISTANCE
            ) {

                playAlertSound();
            }

            updateGuardVision();

            return;
        }

        guardAlertMode = false;
    }

    /* =====================================================
       MOVE GUARD
       ===================================================== */

    function moveGuard() {

        if (
            !currentGuardPath.length
        ) {

            return;
        }

        const dx =
            guardTargetX -
            guardX;

        const dy =
            guardTargetY -
            guardY;

        const distanceToTarget =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (
            distanceToTarget < 1.2
        ) {

            guardTargetIndex++;

            if (
                guardTargetIndex >=
                currentGuardPath.length
            ) {

                guardTargetIndex = 0;
            }

            guardTargetX =
                currentGuardPath[
                    guardTargetIndex
                ].x;

            guardTargetY =
                currentGuardPath[
                    guardTargetIndex
                ].y;

            return;
        }

        const normalizedX =
            dx /
            distanceToTarget;

        const normalizedY =
            dy /
            distanceToTarget;

        guardX +=
            normalizedX *
            guardSpeed;

        guardY +=
            normalizedY *
            guardSpeed;

        const movementAngle =
            Math.atan2(
                normalizedY,
                normalizedX
            ) *
            180 /
            Math.PI;

        guardAngle =
            rotateTowards(
                guardAngle,
                movementAngle,
                GUARD_NORMAL_TURN_SPEED
            );

        updateGuardAlert();

        setPosition(
            guard,
            guardX,
            guardY
        );

        updateGuardVision();
    }

    /* =====================================================
       GUARD VISION VISUAL
       ===================================================== */

    function updateGuardVision() {

        if (!guardVision) {
            return;
        }

        guardVision.style.left =
            `${guardX}%`;

        guardVision.style.top =
            `${guardY + 5}%`;

        guardVision.style.transform =
            `rotate(${guardAngle}deg)`;

        if (guardAlertMode) {

            guardVision.style.opacity =
                "0.82";

            guardVision.style.width =
                "235px";

            guardVision.style.height =
                "165px";

        } else {

            guardVision.style.opacity =
                "0.58";

            guardVision.style.width =
                "210px";

            guardVision.style.height =
                "150px";
        }
    }

    /* =====================================================
       HIDDEN / OBSTACLE CHECK
       ===================================================== */

    function isBehindObstacle() {

        if (!gameBoard) {
            return false;
        }

        const boardRect =
            gameBoard.getBoundingClientRect();

        if (
            boardRect.width === 0 ||
            boardRect.height === 0
        ) {

            return false;
        }

        const px =
            (playerX / 100) *
            boardRect.width;

        const py =
            (playerY / 100) *
            boardRect.height;

        const allCovers = [
            ...obstacles,
            ...extraHidingSpots
        ];

        for (
            const obstacle
            of allCovers
        ) {

            if (!obstacle) {
                continue;
            }

            const rect =
                obstacle.getBoundingClientRect();

            const ox =
                rect.left -
                boardRect.left;

            const oy =
                rect.top -
                boardRect.top;

            const ow =
                rect.width;

            const oh =
                rect.height;

            const padding = 22;

            const inside =
                px >=
                ox - padding &&

                px <=
                ox +
                ow +
                padding &&

                py >=
                oy - padding &&

                py <=
                oy +
                oh +
                padding;

            if (inside) {

                return true;
            }
        }

        return false;
    }

    /* =====================================================
       SAFE STATUS
       ===================================================== */

    function updateSafeStatus() {

        if (!gameRunning) {

            safeMessage.style.opacity =
                "0";

            return;
        }

        const hidden =
            isBehindObstacle();

        if (hidden) {

            safeMessage.style.opacity =
                "1";

            safeMessage.style.left =
                `${playerX + 2}%`;

            safeMessage.style.top =
                `${playerY - 8}%`;

            instructionIcon.textContent =
                "🛡️";

            instructionText.textContent =
                "HIDDEN — the guard can't see you";

            if (!wasHidden) {

                playHideSound();
            }

            wasHidden = true;

        } else {

            safeMessage.style.opacity =
                "0";

            wasHidden = false;

            if (!collectedKey) {

                instructionIcon.textContent =
                    "🔑";

                instructionText.textContent =
                    "Find the key and stay away from the guard";

            } else if (
                !collectedDiamond
            ) {

                instructionIcon.textContent =
                    "💎";

                instructionText.textContent =
                    "Key unlocked — steal the diamond";

            } else {

                instructionIcon.textContent =
                    "🚪";

                instructionText.textContent =
                    "Diamond secured — reach the exit";
            }
        }
    }

    /* =====================================================
       STRICT BODY VISION DETECTION
       ===================================================== */

    function guardCanSeePlayer() {

        if (!gameRunning) {
            return false;
        }

        if (isBehindObstacle()) {
            return false;
        }

        const boardRect =
            gameBoard.getBoundingClientRect();

        if (
            boardRect.width === 0 ||
            boardRect.height === 0
        ) {

            return false;
        }

        const playerWidth =
            (
                player.offsetWidth /
                boardRect.width
            ) *
            100;

        const playerHeight =
            (
                player.offsetHeight /
                boardRect.height
            ) *
            100;

        const halfWidth =
            playerWidth / 2;

        const halfHeight =
            playerHeight / 2;

        const points = [

            {
                x: playerX,
                y: playerY
            },

            {
                x: playerX - halfWidth,
                y: playerY - halfHeight
            },

            {
                x: playerX + halfWidth,
                y: playerY - halfHeight
            },

            {
                x: playerX - halfWidth,
                y: playerY + halfHeight
            },

            {
                x: playerX + halfWidth,
                y: playerY + halfHeight
            },

            {
                x: playerX - halfWidth,
                y: playerY
            },

            {
                x: playerX + halfWidth,
                y: playerY
            },

            {
                x: playerX,
                y: playerY - halfHeight
            },

            {
                x: playerX,
                y: playerY + halfHeight
            }
        ];

        const guardToPlayerDistance =
            distance(
                playerX,
                playerY,
                guardX,
                guardY
            );

        const maxDistance =
            guardAlertMode
                ? ALERT_VISION_DISTANCE
                : NORMAL_VISION_DISTANCE;

        if (
            guardToPlayerDistance >
            maxDistance
        ) {

            return false;
        }

        for (
            const point
            of points
        ) {

            const dx =
                point.x -
                guardX;

            const dy =
                point.y -
                guardY;

            const pointDistance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );

            if (
                pointDistance >
                maxDistance
            ) {

                continue;
            }

            const pointAngle =
                Math.atan2(
                    dy,
                    dx
                ) *
                180 /
                Math.PI;

            let angleDifference =
                Math.abs(
                    pointAngle -
                    guardAngle
                );

            angleDifference =
                normalizeAngle(
                    angleDifference
                );

            angleDifference =
                Math.abs(
                    angleDifference
                );

            const allowedAngle =
                guardAlertMode
                    ? ALERT_VISION_ANGLE
                    : NORMAL_VISION_ANGLE;

            if (
                angleDifference <=
                allowedAngle
            ) {

                return true;
            }
        }

        return false;
    }

    /* =====================================================
       TIMER
       ===================================================== */

    function startTimer() {

        if (timerInterval !== null) {

            clearInterval(
                timerInterval
            );
        }

        timerInterval =
            setInterval(() => {

                if (
                    !gameRunning ||
                    gameOver
                ) {

                    return;
                }

                timeLeft =
                    Math.max(
                        0,
                        timeLeft - 1
                    );

                timerText.textContent =
                    timeLeft;

                const percentage =
                    ((30 - timeLeft) /
                        30) *
                    100;

                progressBar.style.width =
                    `${percentage}%`;

                if (
                    timeLeft <= 5
                ) {

                    timerText.style.color =
                        "#ff5875";

                    playAlertSound();

                } else {

                    timerText.style.color =
                        "#ffd166";
                }

                if (
                    timeLeft <= 0
                ) {

                    loseGame(
                        "TIME"
                    );
                }

            }, 1000);
    }

    /* =====================================================
       GUARD LOOP
       ===================================================== */

    function startGuard() {

        if (guardInterval !== null) {

            clearInterval(
                guardInterval
            );
        }

        guardInterval =
            setInterval(() => {

                if (
                    !gameRunning ||
                    gameOver
                ) {

                    return;
                }

                moveGuard();

            }, 30);
    }

    /* =====================================================
       COLLECTIBLES
       ===================================================== */

    function checkCollectibles() {

        if (
            !gameRunning ||
            gameOver
        ) {

            return;
        }

        const data =
            levels[level];

        /* KEY */

        if (
            !collectedKey &&
            distance(
                playerX,
                playerY,
                data.key.x,
                data.key.y
            ) < 8
        ) {

            collectedKey = true;

            key.classList.add(
                "hidden"
            );

            diamond.classList.remove(
                "hidden"
            );

            playKeySound();

            instructionIcon.textContent =
                "💎";

            instructionText.textContent =
                "KEY FOUND — steal the diamond";

            progressBar.style.width =
                "35%";
        }

        /* DIAMOND */

        if (
            collectedKey &&
            !collectedDiamond &&
            distance(
                playerX,
                playerY,
                data.diamond.x,
                data.diamond.y
            ) < 9
        ) {

            collectedDiamond = true;

            diamond.classList.add(
                "hidden"
            );

            coinsCount += 250;

            coinText.textContent =
                coinsCount;

            playDiamondSound();

            instructionIcon.textContent =
                "🚪";

            instructionText.textContent =
                "DIAMOND SECURED — escape through the exit";

            progressBar.style.width =
                "70%";

            exit.style.opacity =
                "1";

            const exitSmall =
                exit.querySelector("small");

            if (exitSmall) {

                exitSmall.textContent =
                    "OPEN";
            }
        }

        /* COINS */

        data.coins.forEach(
            (coinData, index) => {

                if (
                    collectedCoins.has(index)
                ) {

                    return;
                }

                if (
                    distance(
                        playerX,
                        playerY,
                        coinData.x,
                        coinData.y
                    ) < 8
                ) {

                    collectedCoins.add(
                        index
                    );

                    coinsCount += 50;

                    coinText.textContent =
                        coinsCount;

                    playCoinSound();

                    const coinElements =
                        document.querySelectorAll(
                            ".coin"
                        );

                    const coin =
                        coinElements[index];

                    if (coin) {

                        coin.style.opacity =
                            "0";

                        coin.style.transform =
                            "scale(1.8)";

                        coin.style.transition =
                            "all .25s ease";
                    }
                }
            }
        );
    }

    /* =====================================================
       EXIT
       ===================================================== */

    function checkExit() {

        if (
            !gameRunning ||
            gameOver
        ) {

            return;
        }

        if (
            !collectedDiamond
        ) {

            return;
        }

        const exitData =
            levels[level].exit;

        if (
            distance(
                playerX,
                playerY,
                exitData.x,
                exitData.y
            ) < 10
        ) {

            completeLevel();
        }
    }

    /* =====================================================
       GAME LOOP
       ===================================================== */

    function gameLoop() {

        if (
            !gameRunning ||
            gameOver
        ) {

            return;
        }

        if (
            guardCanSeePlayer()
        ) {

            playAlertSound();

            loseGame(
                "CAUGHT"
            );

            return;
        }

        updateSafeStatus();

        animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }

    /* =====================================================
       RESET LEVEL
       ===================================================== */

    function resetLevel() {

        const data =
            levels[level];

        if (!data) {
            return;
        }

        clearIntervals();

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;
        }

        gameRunning = false;

        gameOver = false;

        collectedKey = false;

        collectedDiamond = false;

        collectedCoins.clear();

        wasHidden = false;

        alertCooldown = false;

        guardAlertMode = false;

        timeLeft = 30;

        /* PLAYER */

        setPlayerPosition(
            data.player.x,
            data.player.y
        );

        /* GUARD */

        setupGuardPath();

        setPosition(
            guard,
            guardX,
            guardY
        );

        /* KEY */

        key.classList.remove(
            "hidden"
        );

        setPosition(
            key,
            data.key.x,
            data.key.y
        );

        /* DIAMOND */

        diamond.classList.add(
            "hidden"
        );

        setPosition(
            diamond,
            data.diamond.x,
            data.diamond.y
        );

        /* EXIT */

        setPosition(
            exit,
            data.exit.x,
            data.exit.y
        );

        exit.style.opacity =
            "0.65";

        const exitSmall =
            exit.querySelector("small");

        if (exitSmall) {

            exitSmall.textContent =
                "LOCKED";
        }

        /* COINS */

        document
            .querySelectorAll(".coin")
            .forEach(coin => {

                coin.style.opacity =
                    "1";

                coin.style.transform =
                    "";

                coin.style.transition =
                    "";
            });

        /* HIDING SPOTS */

        createExtraHidingSpots();

        /* UI */

        levelText.textContent =
            String(level)
                .padStart(2, "0");

        coinText.textContent =
            coinsCount;

        timerText.textContent =
            timeLeft;

        timerText.style.color =
            "#ffd166";

        progressBar.style.width =
            "0%";

        safeMessage.style.opacity =
            "0";

        instructionIcon.textContent =
            "👆";

        instructionText.textContent =
            "Drag the thief around and hide behind objects";

        updateGuardVision();

        hideAllScreens();
    }

    /* =====================================================
       START LEVEL
       ===================================================== */

    function startLevel() {

        initAudio();

        playClickSound();

        resetLevel();

        gameRunning = true;

        gameOver = false;

        startTimer();

        startGuard();

        instructionIcon.textContent =
            "👆";

        instructionText.textContent =
            "Find the key — avoid the guard's red vision";

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );
        }

        animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }

    /* =====================================================
       GAME OVER
       ===================================================== */

    function loseGame(reason) {

        if (gameOver) {
            return;
        }

        gameOver = true;

        gameRunning = false;

        guardAlertMode = false;

        clearIntervals();

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;
        }

        if (
            reason === "TIME"
        ) {

            instructionText.textContent =
                "Time's up!";

        } else {

            instructionText.textContent =
                "The guard spotted you!";
        }

        playGameOverSound();

        showScreen(
            gameOverScreen
        );
    }

    /* =====================================================
       LEVEL COMPLETE
       ===================================================== */

    function completeLevel() {

        if (
            gameOver ||
            !gameRunning
        ) {

            return;
        }

        gameRunning = false;

        clearIntervals();

        if (animationFrame) {

            cancelAnimationFrame(
                animationFrame
            );

            animationFrame = null;
        }

        const bonus =
            timeLeft * 10;

        coinsCount +=
            500 +
            bonus;

        coinText.textContent =
            coinsCount;

        timeBonus.textContent =
            `+${bonus}`;

        progressBar.style.width =
            "100%";

        playSuccessSound();

        showScreen(
            successScreen
        );
    }

    /* =====================================================
       NEXT LEVEL
       ===================================================== */

    function nextLevel() {

        playClickSound();

        /* FINAL CTA AFTER LEVEL 10 */

        if (
            level >= 10
        ) {

            showScreen(
                ctaScreen
            );

            return;
        }

        level++;

        startLevel();
    }

    /* =====================================================
       RETRY
       ===================================================== */

    function retryLevel() {

        playClickSound();

        startLevel();
    }

    /* =====================================================
       BUTTON EVENTS
       ===================================================== */

    startButton.addEventListener(
        "click",
        function () {

            console.log(
                "START HEIST clicked"
            );

            initAudio();

            startLevel();
        }
    );

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            function () {

                initAudio();

                nextLevel();
            }
        );
    }

    if (retryButton) {

        retryButton.addEventListener(
            "click",
            function () {

                initAudio();

                retryLevel();
            }
        );
    }

    if (playNowButton) {

        playNowButton.addEventListener(
            "click",
            function () {

                initAudio();

                level = 1;

                coinsCount = 0;

                startLevel();
            }
        );
    }

    /* =====================================================
       POINTER / TOUCH
       ===================================================== */

    function movePlayerFromPointer(
        event
    ) {

        if (
            !gameRunning ||
            gameOver
        ) {

            return;
        }

        const rect =
            gameBoard.getBoundingClientRect();

        let clientX;
        let clientY;

        if (
            event.touches &&
            event.touches.length
        ) {

            clientX =
                event.touches[0].clientX;

            clientY =
                event.touches[0].clientY;

        } else {

            clientX =
                event.clientX;

            clientY =
                event.clientY;
        }

        const x =
            ((clientX - rect.left) /
                rect.width) *
            100;

        const y =
            ((clientY - rect.top) /
                rect.height) *
            100;

        setPlayerPosition(
            x - 2,
            y - 4
        );
    }

    /* =====================================================
       PLAYER POINTER DRAG
       ===================================================== */

    player.addEventListener(
        "pointerdown",
        event => {

            if (
                !gameRunning ||
                gameOver
            ) {

                return;
            }

            initAudio();

            dragging = true;

            try {

                player.setPointerCapture(
                    event.pointerId
                );

            } catch (error) {}

            movePlayerFromPointer(
                event
            );

            event.preventDefault();
        }
    );

    player.addEventListener(
        "pointermove",
        event => {

            if (!dragging) {
                return;
            }

            movePlayerFromPointer(
                event
            );

            event.preventDefault();
        }
    );

    player.addEventListener(
        "pointerup",
        event => {

            dragging = false;

            try {

                player.releasePointerCapture(
                    event.pointerId
                );

            } catch (error) {}
        }
    );

    player.addEventListener(
        "pointercancel",
        () => {

            dragging = false;
        }
    );

    /* =====================================================
       BOARD TOUCH / DRAG
       ===================================================== */

    gameBoard.addEventListener(
        "pointerdown",
        event => {

            if (
                !gameRunning ||
                gameOver
            ) {

                return;
            }

            if (
                event.target === player
            ) {

                return;
            }

            initAudio();

            dragging = true;

            movePlayerFromPointer(
                event
            );

            event.preventDefault();
        }
    );

    gameBoard.addEventListener(
        "pointermove",
        event => {

            if (!dragging) {
                return;
            }

            movePlayerFromPointer(
                event
            );

            event.preventDefault();
        }
    );

    gameBoard.addEventListener(
        "pointerup",
        () => {

            dragging = false;
        }
    );

    gameBoard.addEventListener(
        "pointercancel",
        () => {

            dragging = false;
        }
    );

    /* =====================================================
       KEYBOARD
       ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                !gameRunning ||
                gameOver
            ) {

                return;
            }

            let x =
                playerX;

            let y =
                playerY;

            const speed =
                event.shiftKey
                    ? 3
                    : 2;

            switch (
                event.key.toLowerCase()
            ) {

                case "arrowup":
                case "w":

                    y -= speed;

                    break;

                case "arrowdown":
                case "s":

                    y += speed;

                    break;

                case "arrowleft":
                case "a":

                    x -= speed;

                    break;

                case "arrowright":
                case "d":

                    x += speed;

                    break;

                default:

                    return;
            }

            setPlayerPosition(
                x,
                y
            );

            event.preventDefault();
        }
    );

    /* =====================================================
       INITIAL GAME STATE
       ===================================================== */

    resetLevel();

    showScreen(
        startScreen
    );

    console.log(
        "Thief Escape loaded successfully."
    );

});