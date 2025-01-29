// components/DatabasePage.jsx
"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function DatabasePage({ onClose }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);

  const [project, setProject] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [deviceVersion, setDeviceVersion] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch("http://localhost:3005/database");
      if (!response.ok) {
        throw new Error("Failed to fetch devices");
      }
      const data = await response.json();
      setDevices(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAddDevice = () => {
    setIsEditing(false);
    setCurrentDevice(null);
    setProject("");
    setLocation("");
    setType("");
    setDeviceVersion("");
    setSerialNumber("");
    setShowModal(true);
  };

  // Handle Edit Device
  const handleEditDevice = (device) => {
    setIsEditing(true);
    setCurrentDevice(device);
    setProject(device.project);
    setLocation(device.location);
    setType(device.type);
    setDeviceVersion(device.deviceVersion);
    setSerialNumber(device.serialNumber);
    setShowModal(true);
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    try {
      const response = await fetch(`http://localhost:3005/database/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete device");
      }
      setDevices(devices.filter((device) => device.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !project.trim() ||
      !location.trim() ||
      !type.trim() ||
      !deviceVersion.trim() ||
      !serialNumber.trim()
    ) {
      alert("All fields are required.");
      return;
    }

    const deviceData = {
      project: project.trim(),
      location: location.trim(),
      type: type.trim(),
      deviceVersion: deviceVersion.trim(),
      serialNumber: serialNumber.trim(),
    };

    try {
      let response;
      if (isEditing && currentDevice) {
        // Update device
        response = await fetch(
          `http://localhost:3005/database/${currentDevice.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(deviceData),
          },
        );
      } else {
        // Add new device
        response = await fetch("http://localhost:3005/database", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deviceData),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to save device");
      }

      const savedDevice = await response.json();

      if (isEditing) {
        setDevices(
          devices.map((device) =>
            device.id === savedDevice.id ? savedDevice : device,
          ),
        );
      } else {
        setDevices([...devices, savedDevice]);
      }

      setShowModal(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleDownloadDatabase = () => {
    const dataToExport = devices.map(({ id, ...rest }) => rest);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Devices");

    XLSX.writeFile(workbook, "devices_database.xlsx");
  };

  if (loading)
    return (
      <p className="text-white p-6 bg-[#1e1e1e] min-h-screen">Loading...</p>
    );
  if (error)
    return (
      <p className="text-red-500 p-6 bg-[#1e1e1e] min-h-screen">
        Error: {error}
      </p>
    );

  return (
    <div className="p-6 bg-[#1e1e1e] min-h-screen text-white">
      {/* Close Button within DatabasePage */}
      {onClose && (
        <button
          onClick={onClose}
          className="mb-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Close
        </button>
      )}
      <h1 className="text-2xl font-semibold mb-4">Device Database</h1>
      <div className="flex items-center mb-4">
        <button
          onClick={handleAddDevice}
          className="mr-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          Add Device
        </button>
        <button
          onClick={handleDownloadDatabase}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
        >
          Download Database
        </button>
      </div>

      {devices.length > 0 ? (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">Project</th>
              <th className="border-b p-2">Location</th>
              <th className="border-b p-2">Type</th>
              <th className="border-b p-2">Device Version</th>
              <th className="border-b p-2">Serial Number</th>
              <th className="border-b p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td className="border-b p-2">{device.project}</td>
                <td className="border-b p-2">{device.location}</td>
                <td className="border-b p-2">{device.type}</td>
                <td className="border-b p-2">{device.deviceVersion}</td>
                <td className="border-b p-2">{device.serialNumber}</td>
                <td className="border-b p-2">
                  <button
                    onClick={() => handleEditDevice(device)}
                    className="mr-2 px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(device.id)}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No devices found.</p>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[#242424] p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-xl mb-4">
              {isEditing ? "Edit Device" : "Add Device"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="project" className="text-sm text-gray-300">
                  Project:
                </label>
                <input
                  type="text"
                  id="project"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div>
                <label htmlFor="location" className="text-sm text-gray-300">
                  Location:
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter location"
                  required
                />
              </div>
              <div>
                <label htmlFor="type" className="text-sm text-gray-300">
                  Type:
                </label>
                <input
                  type="text"
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter type"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="deviceVersion"
                  className="text-sm text-gray-300"
                >
                  Device Version:
                </label>
                <input
                  type="text"
                  id="deviceVersion"
                  value={deviceVersion}
                  onChange={(e) => setDeviceVersion(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter device version"
                  required
                />
              </div>
              <div>
                <label htmlFor="serialNumber" className="text-sm text-gray-300">
                  Serial Number:
                </label>
                <input
                  type="text"
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="mt-1 p-2 w-full bg-[#3e3e3e] rounded text-sm text-white"
                  placeholder="Enter serial number"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {isEditing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
