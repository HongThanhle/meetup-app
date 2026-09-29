import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { getSuggestions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

const serializeForHtml = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

function createMapHtml(data) {
  const mapData = serializeForHtml({
    centroid: data.centroid,
    suggestions: data.suggestions.map((place, index) => ({
      id: String(place.id),
      name: place.name,
      address: place.address || '',
      lat: place.lat,
      lng: place.lng,
      rank: index + 1,
    })),
  });

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; background: #f1eae0; }
      .place-pin {
        width: 24px; height: 24px; border: 2px solid white; border-radius: 50%;
        background: #be6a43; color: white; display: flex; align-items: center;
        justify-content: center; font: 700 12px sans-serif; box-shadow: 0 2px 5px #0005;
      }
      .place-pin.selected { background: #4a3428; transform: scale(1.2); }
      .center-pin {
        width: 18px; height: 18px; border: 3px solid white; border-radius: 50%;
        background: #3978c5; box-shadow: 0 1px 5px #0007;
      }
      #map-error {
        display: none; position: absolute; z-index: 1000; bottom: 8px; left: 8px; right: 8px;
        padding: 8px 12px; border: 1px solid #e8ded2; border-radius: 10px;
        background: rgba(255, 255, 255, .96); color: #4a3428;
        font: 12px/1.4 sans-serif; text-align: center; box-shadow: 0 2px 8px #0002;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="map-error">Không tải được bản đồ từ các máy chủ bản đồ. Kiểm tra Internet trên điện thoại rồi thử lại.</div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      onerror="document.getElementById('map-error').style.display='block'"></script>
    <script>
      if (window.L) {
        const data = ${mapData};
        const map = L.map('map', { zoomControl: true });
        const markerById = {};
        const placeMarkers = [];
        let visibleTiles = 0;
        let tileErrorCount = 0;
        let tileSourceIndex = 0;
        let activeTileLayer = null;
        let tileLoadTimer;
        const createPlaceIcon = (place, selected = false) => L.divIcon({
          className: '',
          html: '<div class="place-pin' + (selected ? ' selected' : '') + '">' + place.rank + '</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const errorBanner = document.getElementById('map-error');
        const showError = () => { errorBanner.style.display = 'block'; };
        const hideError = () => { errorBanner.style.display = 'none'; };
        const tileSources = [
          {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            options: {
              maxZoom: 19,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            },
          },
          {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            options: {
              maxZoom: 19,
              attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, USGS, Intermap, and OpenStreetMap contributors',
            },
          },
        ];
        const onTileLoad = () => {
          visibleTiles += 1;
          hideError();
          clearTimeout(tileLoadTimer);
        };
        const tryNextTileSource = () => {
          clearTimeout(tileLoadTimer);
          if (activeTileLayer) map.removeLayer(activeTileLayer);
          visibleTiles = 0;
          tileErrorCount = 0;
          const source = tileSources[tileSourceIndex];
          tileSourceIndex += 1;
          if (!source) {
            showError();
            return;
          }
          activeTileLayer = L.tileLayer(source.url, source.options);
          activeTileLayer.on('tileload', onTileLoad);
          activeTileLayer.on('tileerror', () => {
            tileErrorCount += 1;
            if (tileErrorCount >= 3 && visibleTiles === 0) tryNextTileSource();
          });
          activeTileLayer.addTo(map);
          tileLoadTimer = setTimeout(() => {
            if (visibleTiles === 0) tryNextTileSource();
          }, 8000);
        };
        tryNextTileSource();

        const centerMarker = L.marker([data.centroid.lat, data.centroid.lng], {
          icon: L.divIcon({ className: '', html: '<div class="center-pin"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }),
        }).addTo(map);
        const centerLabel = document.createElement('strong');
        centerLabel.textContent = 'Điểm trung tâm của nhóm';
        centerMarker.bindPopup(centerLabel);

        data.suggestions.forEach((place) => {
          const marker = L.marker([place.lat, place.lng], {
            icon: createPlaceIcon(place),
          }).addTo(map);
          const popup = document.createElement('div');
          const name = document.createElement('strong');
          name.textContent = place.name;
          popup.appendChild(name);
          if (place.address) {
            const address = document.createElement('div');
            address.textContent = place.address;
            popup.appendChild(address);
          }
          marker.bindPopup(popup);
          marker.on('click', () => {
            window.selectPlace(place.id);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: place.id }));
          });
          markerById[place.id] = marker;
          placeMarkers.push({ place, marker });
        });

        const points = [[data.centroid.lat, data.centroid.lng], ...data.suggestions.map((place) => [place.lat, place.lng])];
        const fitAllPoints = () => {
          map.invalidateSize();
          if (points.length > 1) {
            map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
          } else {
            map.setView(points[0], 15);
          }
        };
        setTimeout(fitAllPoints, 250);

        window.selectPlace = (placeId) => {
          const marker = markerById[String(placeId)];
          if (marker) {
            placeMarkers.forEach(({ place: candidate, marker: candidateMarker }) => {
              candidateMarker.setIcon(createPlaceIcon(candidate, String(candidate.id) === String(placeId)));
            });
            map.setView(marker.getLatLng(), 17, { animate: true });
            setTimeout(() => marker.openPopup(), 250);
          }
        };
      } else {
        document.getElementById('map-error').style.display = 'block';
      }
    </script>
  </body>
</html>`;
}

export default function SuggestionScreen({ route }) {
  const { groupId } = route.params;
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const mapHtml = useMemo(() => (data ? createMapHtml(data) : ''), [data]);
  const mapSource = useMemo(() => ({
    html: mapHtml,
    baseUrl: 'https://www.openstreetmap.org/',
  }), [mapHtml]);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setMapReady(false);
    try {
      const result = await getSuggestions(token, groupId);
      setData(result);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Không lấy được gợi ý. Có thể chưa đủ người gửi vị trí.');
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchSuggestions();
    }, [fetchSuggestions])
  );

  const selectPlace = (place) => {
    const placeId = String(place.id);
    setSelectedPlaceId(placeId);
    if (mapReady) {
      mapRef.current?.injectJavaScript(`window.selectPlace && window.selectPlace(${serializeForHtml(placeId)}); true;`);
    }
  };

  const handleMapMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'select') {
        setSelectedPlaceId(String(message.id));
      }
    } catch (error) {
      Alert.alert('Lỗi bản đồ', 'Không đọc được sự kiện chọn địa điểm từ bản đồ.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gợi ý điểm hẹn</Text>

      {loading && <ActivityIndicator style={{ marginTop: spacing.xl }} size="large" color={colors.primary} />}

      {!loading && data && (
        <>
          {/* Bản đồ hiện điểm trung tâm + các quán gợi ý */}
          <View style={[styles.mapCard, shadow]}>
            <WebView
              ref={mapRef}
              style={styles.map}
              originWhitelist={['*']}
              source={mapSource}
              javaScriptEnabled
              domStorageEnabled
              onLoadStart={() => setMapReady(false)}
              onLoadEnd={() => {
                setMapReady(true);
                if (selectedPlaceId) {
                  mapRef.current?.injectJavaScript(`window.selectPlace && window.selectPlace(${serializeForHtml(selectedPlaceId)}); true;`);
                }
              }}
              onMessage={handleMapMessage}
              onError={() => Alert.alert('Lỗi bản đồ', 'Không tải được bản đồ. Kiểm tra kết nối Internet và thử lại.')}
            />
          </View>

          <View style={[styles.centroidCard, shadow]}>
            <Ionicons name="locate" size={16} color={colors.accent} />
            <Text style={styles.centroidLabel}>  Điểm trung tâm của nhóm</Text>
            <Text style={styles.centroidValue}>
              {data.centroid.lat.toFixed(5)}, {data.centroid.lng.toFixed(5)}
            </Text>
          </View>

          <FlatList
            data={data.suggestions}
            keyExtractor={(item) => String(item.id)}
            style={{ marginTop: spacing.md }}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: String(item.id) === selectedPlaceId }}
                activeOpacity={0.8}
                onPress={() => selectPlace(item)}
                style={[
                  styles.placeRow,
                  shadow,
                  String(item.id) === selectedPlaceId && styles.selectedPlaceRow,
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.placeType}>{item.type}</Text>
                  {item.address && (
                    <Text style={styles.placeAddress} numberOfLines={2}>{item.address}</Text>
                  )}
                </View>
                <View style={styles.distancePill}>
                  <Text style={styles.distanceText}>{item.distance.toFixed(2)} km</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons name="cafe-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyText}>Chưa tìm được quán nào gần đó.</Text>
              </View>
            }
          />
        </>
      )}

      <TouchableOpacity style={styles.refreshButton} onPress={fetchSuggestions} activeOpacity={0.85}>
        <Ionicons name="refresh" size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.refreshText}>Làm mới</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  mapCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 250,
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  centroidCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroidLabel: {
    ...typography.label,
  },
  centroidValue: {
    ...typography.body,
    fontWeight: '700',
    width: '100%',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  selectedPlaceRow: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '700',
    color: colors.accent,
    fontSize: 13,
  },
  placeName: {
    ...typography.body,
    fontWeight: '600',
  },
  placeType: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  placeAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  distancePill: {
    backgroundColor: '#E9F0E5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  distanceText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
  emptyBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.subtitle,
  },
  refreshButton: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: colors.primary,
    fontWeight: '700',
  },
});