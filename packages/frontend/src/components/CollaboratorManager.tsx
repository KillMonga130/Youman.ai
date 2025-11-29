import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Edit,
  Eye,
  Shield,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  UserX,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAppStore } from '../store';
import { Alert } from './ui';

interface Collaborator {
  userId: string;
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'admin';
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface CollaboratorManagerProps {
  projectId: string;
  projectName?: string;
  onClose?: () => void;
}

export function CollaboratorManager({ projectId, projectName, onClose }: CollaboratorManagerProps): JSX.Element {
  const { user } = useAppStore();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  
  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'viewer' as 'viewer' | 'editor' | 'admin',
    message: '',
  });
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [newRole, setNewRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');

  useEffect(() => {
    if (projectId) {
      loadCollaborators();
      loadInvitations();
    }
  }, [projectId]);

  const loadCollaborators = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.getProjectCollaborators(projectId);
      setCollaborators(result.collaborators ?? []);
    } catch (err) {
      console.error('Failed to load collaborators:', err);
      setError('Failed to load collaborators');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const result = await apiClient.getProjectInvitations(projectId);
      setInvitations(result.invitations ?? []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim()) {
      setError('Email is required');
      return;
    }
    try {
      await apiClient.inviteCollaborator(projectId, {
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        message: inviteForm.message || undefined,
      });
      setSuccess('Invitation sent successfully');
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        role: 'viewer',
        message: '',
      });
      loadInvitations();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to send invitation');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingCollaborator) return;
    try {
      await apiClient.updateCollaboratorRole(projectId, editingCollaborator.userId, newRole);
      setSuccess('Role updated successfully');
      setShowEditRoleModal(false);
      setEditingCollaborator(null);
      loadCollaborators();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to update role');
    }
  };

  const handleRemoveCollaborator = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this project?`)) {
      return;
    }
    try {
      await apiClient.removeCollaborator(projectId, userId);
      setSuccess('Collaborator removed successfully');
      loadCollaborators();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to remove collaborator');
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }
    try {
      await apiClient.revokeInvitation(projectId, invitationId);
      setSuccess('Invitation revoked');
      loadInvitations();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to revoke invitation');
    }
  };

  const openEditRoleModal = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    setNewRole(collaborator.role);
    setShowEditRoleModal(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'editor':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborators
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {projectName ? `Manage collaborators for "${projectName}"` : 'Manage project collaborators'}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success"><CheckCircle className="w-4 h-4 mr-2" />{success}</Alert>}

      {/* Active Collaborators */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Active Collaborators</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : collaborators.length > 0 ? (
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.userId}
                className="card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {collaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{collaborator.name}</span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs flex items-center gap-1">
                        {getRoleIcon(collaborator.role)}
                        {getRoleLabel(collaborator.role)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {collaborator.email} • Joined {new Date(collaborator.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditRoleModal(collaborator)}
                    className="btn btn-outline btn-sm"
                    title="Change role"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {collaborator.userId !== user?.id && (
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.userId, collaborator.email)}
                      className="btn btn-outline btn-sm text-red-600"
                      title="Remove collaborator"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No collaborators yet</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn btn-primary btn-sm mt-4"
            >
              Invite First Collaborator
            </button>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{invitation.email}</span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs">
                        {getRoleLabel(invitation.role)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Invited {new Date(invitation.createdAt).toLocaleDateString()}
                      {invitation.expiresAt && (
                        <span> • Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                  className="btn btn-outline btn-sm text-red-600"
                  title="Revoke invitation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Invite Collaborator</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({ email: '', role: 'viewer', message: '' });
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="input w-full"
                  placeholder="collaborator@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="viewer">Viewer - Can view project</option>
                  <option value="editor">Editor - Can view and edit</option>
                  <option value="admin">Admin - Full access including managing collaborators</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message (Optional)</label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  className="input w-full h-24"
                  placeholder="Add a personal message to the invitation..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteForm({ email: '', role: 'viewer', message: '' });
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  className="btn btn-primary"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditRoleModal && editingCollaborator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Change Role</h3>
              <button
                onClick={() => {
                  setShowEditRoleModal(false);
                  setEditingCollaborator(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Change role for <span className="font-medium">{editingCollaborator.name}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="input w-full"
                >
                  <option value="viewer">Viewer - Can view project</option>
                  <option value="editor">Editor - Can view and edit</option>
                  <option value="admin">Admin - Full access including managing collaborators</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEditRoleModal(false);
                    setEditingCollaborator(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="btn btn-primary"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

