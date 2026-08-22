import React, { useState, useEffect } from 'react';
import { HalftoneCircle } from './HalftoneCircle';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export interface PhotoSlide {
  src: string;
  alt: string;
  badge: string;
  caption: string;
}

interface DynamicPhotoShowcaseProps {
  slides: PhotoSlide[];
  autoPlayInterval?: number; // ms, default 4500
  className?: string;
  aspectRatio?: string;
}

export const DynamicPhotoShowcase: React.FC<DynamicPhotoShowcaseProps> = ({
  slides,
  autoPlayInterval = 4500,
  className = '',
  aspectRatio = '4/5'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [slides.length, autoPlayInterval, isHovered]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div
      className={`dynamic-photo-showcase ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid rgba(201, 190, 176, 0.45)',
        aspectRatio,
        backgroundColor: 'var(--mist)'
      }}
    >
      {/* Slides Container */}
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.src}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'scale(1)' : 'scale(1.04)',
              transition: 'opacity 0.75s ease, transform 0.85s ease',
              pointerEvents: isActive ? 'auto' : 'none'
            }}
          >
            <img
              src={slide.src}
              alt={slide.alt}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
            {/* Subtle Gradient Shadow */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(46, 44, 40, 0.78) 0%, rgba(46, 44, 40, 0.15) 45%, transparent 75%)',
                pointerEvents: 'none'
              }}
            />
          </div>
        );
      })}

      {/* Floating Top Pill */}
      <div
        style={{
          position: 'absolute',
          top: '1.2rem',
          left: '1.2rem',
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(8px)',
          padding: '0.4rem 0.85rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--ink)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          border: '1px solid rgba(201, 190, 176, 0.35)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}
      >
        <Sparkles size={13} color="#8A7A68" />
        <span>{slides[currentIndex].badge}</span>
      </div>

      {/* Arrow Controls */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            style={{
              position: 'absolute',
              top: '50%',
              left: '0.9rem',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(201, 190, 176, 0.4)',
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isHovered ? 1 : 0.6,
              transition: 'all 0.25s ease'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            style={{
              position: 'absolute',
              top: '50%',
              right: '0.9rem',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(201, 190, 176, 0.4)',
              color: 'var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isHovered ? 1 : 0.6,
              transition: 'all 0.25s ease'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Bottom Info Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '1.2rem',
          left: '1.2rem',
          right: '1.2rem',
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          color: 'var(--white)'
        }}
      >
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 500, color: 'var(--white)', textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
            {slides[currentIndex].caption}
          </div>
          <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--taupe-light)', marginTop: '2px' }}>
            Nirvana Studio Wrocław • ul. Przedmiejska 2/02
          </div>
        </div>

        <HalftoneCircle size={32} color="#FFFFFF" opacity={0.8} />
      </div>

      {/* Slide Indicator Dots */}
      {slides.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '0.45rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            gap: '0.4rem'
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === currentIndex ? '20px' : '6px',
                height: '6px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: i === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
