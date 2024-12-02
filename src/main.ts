import './style.css';
import { generate as generateWord } from 'random-words';
import Stats from 'stats.js';

class Position {
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  x: number;
  y: number;
}

class GameObject {
  constructor() {
    this.position = new Position(0, 0)
  }
  position: Position;
}

class TextGameObject extends GameObject {
  readonly width: number;
  readonly height: number;
  readonly context: CanvasRenderingContext2D
  text: string;

  constructor(position: Position, text: string, context: CanvasRenderingContext2D) {
    super()
    this.position = position;

    this.context = context;
    this.text = text;

    const metrics = context.measureText(text);
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const width = metrics.width;

    this.width = width;
    this.height = height;
  }

  matchedString: string | null = null;

  draw() {
    let accumulatedWidth = 0;
    this.text.split('').forEach((char, i) => {
      this.context.fillStyle = this.matchedString?.[i] === char ? 'red' : 'black'
      const metrics = this.context.measureText(char);
      const width = metrics.width;
      this.context.fillText(char, this.position.x + accumulatedWidth, this.position.y);
      accumulatedWidth += width;
    })
  }
}

class MissileGameObject extends GameObject {
  target: TextGameObject;
  readonly context: CanvasRenderingContext2D
  constructor(position: Position, target: TextGameObject, context: CanvasRenderingContext2D) {
    super()
    this.position = position;
    this.context = context;
    this.target = target;
  }

  draw() {
    this.context.fillStyle = 'red';
    this.context.beginPath();
    this.context.arc(this.target.position.x + this.target.width / 2, this.position.y, 10, 0, 2 * Math.PI);
    this.context.fill();
  }
}

class ExplosionParticle extends GameObject {
  radius: number;
  dx: number;
  dy: number;
  alpha: number;
  context: CanvasRenderingContext2D;
  constructor(position: Position, radius: number, dx: number, dy: number, context: CanvasRenderingContext2D) {
    super()
    this.position = position;
    this.radius = radius;
    this.dx = dx;
    this.dy = dy;
    this.alpha = 1;
    this.context = context;
  }
  draw() {
    this.context.save();
    this.context.globalAlpha = this.alpha;
    this.context.fillStyle = 'red';

    this.context.beginPath();

    this.context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
    this.context.fill();

    this.context.restore();
  }
  update() {
    this.draw();
    this.alpha -= 0.01;
    this.position.x += this.dx;
    this.position.y += this.dy;
  }
}

const bootstrap = () => {
    const stats = new Stats()
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);



    const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
    const context = canvas.getContext('2d')!;

    const input = document.querySelector<HTMLInputElement>('#input')!;



    const handleResizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      context.font = "48px Inter";
    }
    // resize the canvas to fill browser window dynamically
    window.addEventListener('resize', handleResizeCanvas, false);
    handleResizeCanvas();
    context.font = "48px Inter";



    // https://www.kirupa.com/animations/ensuring_consistent_animation_speeds.htm
    // set the expected frame rate
    const framesPerSecond = 60;
    let previousTime = performance.now();

    const frameInterval = 1000 / framesPerSecond;
    let deltaTimeMultiplier = 1;
    let deltaTime = 0;



    let GAME_OVER = false;



    const words: TextGameObject[] = []
    const missiles: MissileGameObject[] = []
    const explosionParticles: ExplosionParticle[] = [];


    const onInputChange = (value: string) => {
      words.forEach((word, i) => {
        if (word.text.startsWith(value)) {
          word.matchedString = value;
          if (word.matchedString === word.text) {
            missiles.push(new MissileGameObject(new Position(word.position.x, canvas.height), word, context))
            words.splice(i, 1)
            changeInput('');
          }
        } else {
          word.matchedString = null;
        }
      })
    }
    const changeInput = (value: string) => {
      input.value = value;
      onInputChange(value);
    }
    
    input.addEventListener('input', (event) => {
      const inputValue = (event.target as HTMLInputElement).value
      changeInput(inputValue)
    })



    const spawnInterval = setInterval(() => {
      const word = new TextGameObject(new Position(Math.random() * canvas.width, 0), generateWord() as string, context);
      const offset = word.position.x + word.width - canvas.width
      if (offset > 0) {
        word.position.x -= offset
      }
      words.push(word)
    }, 1000);




    const draw: FrameRequestCallback = (timestamp) => {
      stats.begin();

      deltaTime = timestamp - previousTime;
      deltaTimeMultiplier = deltaTime / frameInterval;
      previousTime = timestamp;

      context.clearRect(0, 0, canvas.width, canvas.height);

      words.forEach((word) => {
        word.position.y += 0.5 * deltaTimeMultiplier;
        word.draw()

        if (word.position.y - word.height > canvas.height) {
          alert('Game over ' + word.text)
          GAME_OVER = true;
        }
      })

      missiles.forEach((missile, i) => {
        missile.position.y -= 75 * deltaTimeMultiplier;
        missile.draw()
        missile.target.position.y += 0.5 * deltaTimeMultiplier;
        missile.target.draw()

        if (missile.position.y <= missile.target.position.y) {
          missiles.splice(i, 1)
          for (let i = 0; i <= 150; i++) {
            const dx = (Math.random() - 0.5) * (Math.random() * 6);
            const dy = (Math.random() - 0.5) * (Math.random() * 6);
            const radius = Math.random() * 3;
            const particle = new ExplosionParticle(new Position(missile.target.position.x + missile.target.width / 2, missile.target.position.y), radius, dx, dy, context);
    
            explosionParticles.push(particle);
          }
        }
      })

      explosionParticles.forEach((particle, i) => {
        if (particle.alpha <= 0) {
          explosionParticles.splice(i, 1);
        } else {
          particle.update()
        }
      })

      stats.end();
      if (GAME_OVER) {
        clearInterval(spawnInterval)
        return
      }
      window.requestAnimationFrame(draw);
    };
 
    window.requestAnimationFrame(draw);
}
 
bootstrap();
