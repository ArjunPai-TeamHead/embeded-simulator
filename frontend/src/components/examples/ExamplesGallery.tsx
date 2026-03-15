/**
 * Examples Gallery Component
 *
 * Displays a gallery of example Arduino projects that users can load and run
 */

import React, { useState } from 'react';
import { exampleProjects, getCategories, type ExampleProject } from '../../data/examples';
import './ExamplesGallery.css';

interface ExamplesGalleryProps {
  onLoadExample: (example: ExampleProject) => void;
}

export const ExamplesGallery: React.FC<ExamplesGalleryProps> = ({ onLoadExample }) => {
  const [selectedCategory, setSelectedCategory] = useState<ExampleProject['category'] | 'all'>(
    'all'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    ExampleProject['difficulty'] | 'all'
  >('all');

  const categories = getCategories();

  // Filter examples based on selected category and difficulty
  const filteredExamples = exampleProjects.filter((example) => {
    const categoryMatch = selectedCategory === 'all' || example.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === 'all' || example.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getCategoryIcon = (category: ExampleProject['category']): React.ReactNode => {
    const svgProps = {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
    };

    const icons: Record<ExampleProject['category'], React.ReactNode> = {
      basics: (
        <svg {...svgProps}>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      ),
      sensors: (
        <svg {...svgProps}>
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </svg>
      ),
      displays: (
        <svg {...svgProps}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      communication: (
        <svg {...svgProps}>
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
      ),
      games: (
        <svg {...svgProps}>
          <line x1="6" y1="11" x2="10" y2="11" />
          <line x1="8" y1="9" x2="8" y2="13" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="17" cy="10" r="1" fill="currentColor" />
          <path d="M17 2H7a5 5 0 0 0-5 5v4.4A2.9 2.9 0 0 0 4.8 14l1.5 2.7A3 3 0 0 0 9 18h6a3 3 0 0 0 2.7-1.3l1.5-2.7a2.9 2.9 0 0 0 .3-1.3V7a5 5 0 0 0-5-5Z" />
        </svg>
      ),
      robotics: (
        <svg {...svgProps}>
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
      ),
    };
    return icons[category];
  };

  const getDifficultyColor = (difficulty: ExampleProject['difficulty']): string => {
    const colors: Record<ExampleProject['difficulty'], string> = {
      beginner: '#4ade80',
      intermediate: '#fbbf24',
      advanced: '#f87171',
    };
    return colors[difficulty];
  };

  return (
    <div className="examples-gallery">
      <div className="examples-header">
        <h1>Featured Projects</h1>
        <p>Explore and run example Arduino projects</p>
      </div>

      {/* Filters */}
      <div className="examples-filters">
        <div className="filter-group">
          <label>Category:</label>
          <div className="filter-buttons">
            <button
              className={`filter-button ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>Difficulty:</label>
          <div className="filter-buttons">
            <button
              className={`filter-button ${selectedDifficulty === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('all')}
            >
              All
            </button>
            <button
              className={`filter-button ${selectedDifficulty === 'beginner' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('beginner')}
            >
              Beginner
            </button>
            <button
              className={`filter-button ${selectedDifficulty === 'intermediate' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('intermediate')}
            >
              Intermediate
            </button>
            <button
              className={`filter-button ${selectedDifficulty === 'advanced' ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty('advanced')}
            >
              Advanced
            </button>
          </div>
        </div>
      </div>

      {/* Examples Grid */}
      <div className="examples-grid">
        {filteredExamples.map((example) => (
          <div
            key={example.id}
            className="example-card"
            onClick={() => onLoadExample(example)}
          >
            <div className="example-thumbnail">
              {example.thumbnail ? (
                <img src={example.thumbnail} alt={example.title} className="example-preview-image" />
              ) : (
                <div className="example-placeholder-new">
                  <div className="placeholder-icon">{getCategoryIcon(example.category)}</div>
                  <div className="placeholder-text">
                    <div className="component-count">
                      {example.components.length} component{example.components.length !== 1 ? 's' : ''}
                    </div>
                    <div className="wire-count">
                      {example.wires.length} wire{example.wires.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="example-info">
              <h3 className="example-title">{example.title}</h3>
              <p className="example-description">{example.description}</p>
              <div className="example-meta">
                <span
                  className="example-difficulty"
                  style={{ backgroundColor: getDifficultyColor(example.difficulty) }}
                >
                  {example.difficulty}
                </span>
                <span className="example-category">
                  {getCategoryIcon(example.category)} {example.category}
                </span>
                {example.boards && (
                  <span className="example-board-badge" style={{
                    backgroundColor: '#ef9a9a22',
                    color: '#ef9a9a',
                    border: '1px solid #ef9a9a55',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    Multi-Board
                  </span>
                )}
                {!example.boards && example.boardType === 'raspberry-pi-pico' && (
                  <span className="example-board-badge" style={{
                    backgroundColor: '#e91e8c',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    Pico
                  </span>
                )}
                {!example.boards && example.boardType === 'esp32' && (
                  <span className="example-board-badge" style={{
                    backgroundColor: '#e77d11',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    ESP32
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredExamples.length === 0 && (
        <div className="examples-empty">
          <p>No examples found with the selected filters</p>
        </div>
      )}
    </div>
  );
};
