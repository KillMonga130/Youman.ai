import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

export function ParticleBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles (rain/digital particles)
    const createParticles = () => {
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000);
      particlesRef.current = [];

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: 0.5 + Math.random() * 2,
          length: 10 + Math.random() * 30,
          opacity: 0.1 + Math.random() * 0.3,
        });
      }
    };

    createParticles();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw particles
      particlesRef.current.forEach((particle) => {
        // Draw vertical line (rain effect)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.lineWidth = 1;
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x, particle.y + particle.length);
        ctx.stroke();

        // Update position
        particle.y += particle.speed;

        // Reset if off screen
        if (particle.y > canvas.height) {
          particle.y = -particle.length;
          particle.x = Math.random() * canvas.width;
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
}

