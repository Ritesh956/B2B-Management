import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Role } from '../../store/authStore';
import { ContractStatus, type Contract } from '../../services/contracts';
import RoleGate from '../../components/RoleGate';
import { useContractQuery } from '../../hooks/useContractsQuery';
import { updateContractStatus } from '../../services/contracts';

export default function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [updating, setUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { data, isLoading, refetch } = useContractQuery(id ?? '');
  const contract = data?.contract ?? null;

  const handleStatusChange = async (newStatus: ContractStatus) => {
    if (!contract) return;
    try {
      setUpdating(true);
      await updateContractStatus(contract.id, newStatus);
      setShowStatusMenu(false);
      await refetch();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (contract: Contract) => {
    if (contract.isExpired) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">Expired</span>;
    }
    if (contract.isExpiringSoon) {
      return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">Expiring in {contract.daysUntilExpiry} days</span>;
    }
    return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Active</span>;
  };

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (!contract) return <div className="p-6 text-center text-red-600">Contract not found</div>;

  const startDate = new Date(contract.startDate);
  const endDate = new Date(contract.endDate);

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/contracts')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 mb-2"
          >
            ← Back to Contracts
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{contract.title}</h1>
        </div>
        <div className="text-right">
          {getStatusBadge(contract)}
          <RoleGate roles={[Role.ADMIN, Role.PROCUREMENT]}>
            <div className="mt-3 relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Change Status ▼
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                  {Object.values(ContractStatus).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updating || contract.status === status}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </RoleGate>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Vendor</p>
          <p
            className="text-lg font-semibold text-gray-900 dark:text-gray-50 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
            onClick={() => navigate(`/vendors/${contract.vendor.id}`)}
          >
            {contract.vendor.companyName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{contract.vendor.email}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{contract.status}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{startDate.toLocaleDateString()}</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">End Date</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">{endDate.toLocaleDateString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {contract.isExpired ? (
              <span className="text-red-600 dark:text-red-400">Expired {Math.abs(contract.daysUntilExpiry)} days ago</span>
            ) : (
              <span className="text-green-600 dark:text-green-400">{contract.daysUntilExpiry} days remaining</span>
            )}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Contract Duration</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Created</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {new Date(contract.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* PDF Viewer */}
      {contract.fileUrl ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-4">Contract Document</h2>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <iframe
              src={contract.fileUrl}
              className="w-full h-96 rounded-lg border border-gray-300 dark:border-gray-700"
              title={contract.title}
            />
          </div>
          <div className="mt-3">
            <a
              href={contract.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              📥 Download Contract PDF
            </a>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-200">No contract document attached</p>
        </div>
      )}
    </div>
  );
}
