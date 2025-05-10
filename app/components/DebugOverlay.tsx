import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Button } from 'react-native';
import socketService from '../services/socketService';
import { useLocation } from '../hooks/useLocation';

interface DebugInfo {
  connected: boolean;
  authenticated: boolean;
  locationSharing: boolean;
  lastError?: string;
  lastLocationUpdate?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

interface IntervalStatus {
  active: boolean;
  lastTick: number;
  intervalId: string | null;
  setupTime: string | null;
}

const DebugOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    connected: false,
    authenticated: false,
    locationSharing: false
  });
  const [updateAttempts, setUpdateAttempts] = useState(0);
  const [lastUpdateResult, setLastUpdateResult] = useState<string>('');
  const [intervalStatus, setIntervalStatus] = useState<string>('Unknown');
  const [intervalDetails, setIntervalDetails] = useState<IntervalStatus | null>(null);
  const { userLocation, getCurrentLocation } = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      if (visible) {
        const socketInfo = socketService.getDebugInfo();
        setDebugInfo({
          ...socketInfo,
          currentLocation: userLocation
        });
        
        // Also update interval details regularly
        setIntervalDetails(socketService.getIntervalStatus());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, userLocation]);

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s ago`;
  };

  const triggerManualUpdate = async () => {
    setUpdateAttempts(prev => prev + 1);
    try {
      // Make sure the location function is available
      if (!socketService.hasPositionFunction()) {
        console.log('[DebugOverlay] Setting getCurrentLocation function in socketService');
        socketService.setPositionFunction(getCurrentLocation);
      }
      
      const result = await socketService.forceLocationUpdate();
      setLastUpdateResult(result ? 'Success' : 'Failed');
    } catch (error) {
      setLastUpdateResult(`Error: ${error}`);
    }
  };
  
  const checkIntervalStatus = () => {
    const checkTime = new Date().toISOString();
    console.log(`[DebugOverlay] Checking interval status at ${checkTime}`);
    
    let tickDetected = false;
    
    const checkTimeout = setTimeout(() => {
      if (!tickDetected) {
        console.log('[DebugOverlay] No interval tick detected within 15 seconds');
        setIntervalStatus('No ticks detected');
      }
    }, 15000);
    
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      originalConsoleLog.apply(console, args);
      
      if (args[0] && typeof args[0] === 'string' && 
          (args[0].includes('[SocketService] Interval tick') || 
           args[0].includes('[SocketService] Auth interval tick'))) {
        tickDetected = true;
        clearTimeout(checkTimeout);
        setIntervalStatus('Active: ' + args[0]);
        
        console.log = originalConsoleLog;
      }
    };
    
    setTimeout(() => {
      console.log = originalConsoleLog;
    }, 20000);
  };
  
  const forceRestartInterval = () => {
    // Make sure the position function is always set before restarting
    if (!socketService.hasPositionFunction()) {
      console.log('[DebugOverlay] Setting getCurrentLocation function before restart');
      socketService.setPositionFunction(getCurrentLocation);
    }
    
    const result = socketService.forceRestartInterval();
    setIntervalStatus(result ? 'Restarted' : 'Restart failed');
  };

  if (!visible) {
    return (
      <TouchableOpacity 
        style={styles.debugButton} 
        onPress={() => setVisible(true)}
      >
        <Text style={styles.debugButtonText}>D</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={() => setVisible(false)}
      >
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Socket Debug Info</Text>
      
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Connected: <Text style={debugInfo.connected ? styles.success : styles.error}>
              {debugInfo.connected ? 'YES' : 'NO'}
            </Text>
          </Text>
          
          <Text style={styles.infoText}>
            Authenticated: <Text style={debugInfo.authenticated ? styles.success : styles.error}>
              {debugInfo.authenticated ? 'YES' : 'NO'}
            </Text>
          </Text>
          
          <Text style={styles.infoText}>
            Location Sharing: <Text style={debugInfo.locationSharing ? styles.success : styles.error}>
              {debugInfo.locationSharing ? 'ENABLED' : 'DISABLED'}
            </Text>
          </Text>
          
          <Text style={styles.infoText}>
            Last Update: <Text style={styles.value}>{formatTime(debugInfo.lastLocationUpdate)}</Text>
          </Text>
          
          <Text style={styles.infoText}>
            Update Attempts: <Text style={styles.value}>{updateAttempts}</Text>
          </Text>
          
          <Text style={styles.infoText}>
            Last Result: <Text style={lastUpdateResult === 'Success' ? styles.success : styles.error}>
              {lastUpdateResult || 'None'}
            </Text>
          </Text>
          
          <Text style={styles.infoText}>
            Interval Status: <Text style={styles.value}>{intervalStatus}</Text>
          </Text>
          
          {intervalDetails && (
            <>
              <Text style={styles.sectionTitle}>Interval Details:</Text>
              <Text style={styles.infoText}>
                Active: <Text style={intervalDetails.active ? styles.success : styles.error}>
                  {intervalDetails.active ? 'YES' : 'NO'}
                </Text>
              </Text>
              <Text style={styles.infoText}>
                Last Tick: <Text style={styles.value}>
                  {intervalDetails.lastTick ? formatTime(intervalDetails.lastTick) : 'Never'}
                </Text>
              </Text>
              <Text style={styles.infoText}>
                Interval ID: <Text style={styles.value}>
                  {intervalDetails.intervalId || 'None'}
                </Text>
              </Text>
              <Text style={styles.infoText}>
                Setup Time: <Text style={styles.value}>
                  {intervalDetails.setupTime || 'Unknown'}
                </Text>
              </Text>
            </>
          )}
          
          {debugInfo.lastError && (
            <Text style={styles.infoText}>
              Error: <Text style={styles.error}>{debugInfo.lastError}</Text>
            </Text>
          )}
          
          {debugInfo.currentLocation && (
            <Text style={styles.infoText}>
              Current: <Text style={styles.value}>
                {debugInfo.currentLocation.latitude.toFixed(6)}, {debugInfo.currentLocation.longitude.toFixed(6)}
              </Text>
            </Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.updateButton} 
          onPress={triggerManualUpdate}
        >
          <Text style={styles.updateButtonText}>Force Update</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.updateButton, styles.checkButton]} 
          onPress={checkIntervalStatus}
        >
          <Text style={styles.updateButtonText}>Check Interval</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.updateButton, styles.restartButton]} 
          onPress={forceRestartInterval}
        >
          <Text style={styles.updateButtonText}>Restart Interval</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 300,
    maxHeight: 450,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    zIndex: 999,
  },
  scrollContainer: {
    maxHeight: 350,
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 10,
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  success: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  error: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  value: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  updateButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
    marginBottom: 5,
  },
  checkButton: {
    backgroundColor: '#9C27B0',
    marginRight: 0,
    marginLeft: 5,
  },
  restartButton: {
    backgroundColor: '#FF9800',
    marginTop: 5,
    marginRight: 0,
    marginLeft: 0,
    flex: 1,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
});

export default DebugOverlay; 