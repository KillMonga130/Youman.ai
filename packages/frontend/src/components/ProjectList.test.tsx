/**
 * ProjectList Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectList } from './ProjectList';
import type { Project } from '../store';

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Test Project 1',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    wordCount: 1250,
    status: 'completed',
    detectionScore: 12,
  },
  {
    id: '2',
    name: 'Test Project 2',
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    wordCount: 5420,
    status: 'draft',
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProjectList', () => {
  it('should render empty state when no projects', () => {
    renderWithRouter(
      <ProjectList projects={[]} onDeleteProject={vi.fn()} />
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first project')).toBeInTheDocument();
  });

  it('should render project list with projects', () => {
    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={vi.fn()} />
    );

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    expect(screen.getByText('1,250 words')).toBeInTheDocument();
    expect(screen.getByText('5,420 words')).toBeInTheDocument();
  });

  it('should show select all checkbox', () => {
    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={vi.fn()} />
    );

    const selectAllCheckbox = screen.getByLabelText('Select all projects');
    expect(selectAllCheckbox).toBeInTheDocument();
  });

  it('should select individual project when checkbox clicked', () => {
    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={vi.fn()} />
    );

    const projectCheckbox = screen.getByLabelText('Select Test Project 1');
    fireEvent.click(projectCheckbox);

    expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();
  });

  it('should select all projects when select all clicked', () => {
    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={vi.fn()} />
    );

    const selectAllCheckbox = screen.getByLabelText('Select all projects');
    fireEvent.click(selectAllCheckbox);

    expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
  });

  it('should show bulk operations toolbar when projects selected', () => {
    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={vi.fn()} />
    );

    const projectCheckbox = screen.getByLabelText('Select Test Project 1');
    fireEvent.click(projectCheckbox);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Re-process')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should call onDeleteProject when delete button clicked', () => {
    const onDeleteProject = vi.fn();
    renderWithRouter(
      <ProjectList projects={mockProjects} onDeleteProject={onDeleteProject} />
    );

    const deleteButtons = screen.getAllByTitle('Delete');
    const firstDeleteButton = deleteButtons[0];
    if (firstDeleteButton) {
      fireEvent.click(firstDeleteButton);
    }

    expect(onDeleteProject).toHaveBeenCalledWith('1');
  });
});
