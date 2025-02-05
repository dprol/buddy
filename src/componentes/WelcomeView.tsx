import React, { useState } from 'react';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
}

interface WelcomeScreenProps {
  onSubmit: (config: ApiConfiguration) => void;
}

const WelcomeScreen = ({ onSubmit }: WelcomeScreenProps) => {
  const [apiConfiguration, setApiConfiguration] = useState<ApiConfiguration>({
    provider: 'anthropic',
    apiKey: ''
  });

  const handleSubmit = () => {
    if (apiConfiguration.apiKey) {
      onSubmit(apiConfiguration);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            API Provider
          </label>
          <select
            value={apiConfiguration.provider}
            onChange={(e) => setApiConfiguration(prev => ({ ...prev, provider: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={apiConfiguration.apiKey}
            onChange={(e) => setApiConfiguration(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder="Enter API Key..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            This key is stored locally and only used to make API requests from this extension.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;