import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import {
  getRouteToSuggestion,
  getSuggestions,
  castVote,
  getVoteResults,
  finalizeMeetupPlace,
  reverseGeocode,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

const serializeForHtml = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

function createMapHtml(data) {
  const mapData = serializeForHtml({
    centroid: data.centroid,
    viewerLocation: data.viewerLocation || null,
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
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; background: #f1eae0; }
      .place-pin {
        width: 24px; height: 24px; border: 2px solid white; border-radius: 50%;
        background: #be6a43; color: white; display: flex; align-items: center;
        justify-content: center; font: 700 12px sans-serif; box-shadow: 0 2px 5px #0005;
      }
      .place-pin.selected { background: #4a3428; transform: scale(1.2); }
      .place-cluster {
        display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;
        border: 3px solid rgba(190, 106, 67, .28); border-radius: 50%;
        background: #be6a43; color: #fff; font: 700 13px sans-serif;
        box-shadow: 0 2px 7px #0004;
      }
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
    <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
    <script>
      if (window.L) {
        const data = ${mapData};
        const map = L.map('map', { zoomControl: true });
        const markerById = {};
        const placeById = {};
        const selectedRouteOutline = L.polyline([], {
          color: '#fff',
          weight: 8,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        const selectedRouteLine = L.polyline([], {
          color: '#3978c5',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });
        const viewerLocationMarker = data.viewerLocation
          ? L.circleMarker([data.viewerLocation.lat, data.viewerLocation.lng], {
            radius: 6,
            color: '#fff',
            weight: 2,
            fillColor: '#3978c5',
            fillOpacity: 1,
          })
          : null;
        const markerClusterGroup = typeof L.markerClusterGroup === 'function'
          ? L.markerClusterGroup({
            maxClusterRadius: 48,
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster) => L.divIcon({
              className: '',
              html: '<div class="place-cluster">' + cluster.getChildCount() + '</div>',
              iconSize: [48, 48],
              iconAnchor: [24, 24],
            }),
          })
          : null;
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
          });
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
          });
          markerById[place.id] = marker;
          placeById[place.id] = place;
          if (markerClusterGroup) {
            markerClusterGroup.addLayer(marker);
          } else {
            marker.addTo(map);
          }
        });
        if (markerClusterGroup) {
          markerClusterGroup.addTo(map);
        }

        const points = [[data.centroid.lat, data.centroid.lng], ...data.suggestions.map((place) => [place.lat, place.lng])];
        if (data.viewerLocation) {
          points.push([data.viewerLocation.lat, data.viewerLocation.lng]);
        }
        const fitAllPoints = () => {
          map.invalidateSize();
          if (points.length > 1) {
            map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
          } else {
            map.setView(points[0], 15);
          }
        };
        setTimeout(fitAllPoints, 250);

        window.selectPlace = (placeId, notify = true) => {
          const marker = markerById[String(placeId)];
          const place = placeById[String(placeId)];
          if (marker && place) {
            const openSelectedMarker = () => {
              marker.setIcon(createPlaceIcon(place, true));
              selectedRouteOutline.setLatLngs([]);
              selectedRouteLine.setLatLngs([]);
              if (data.viewerLocation) {
                viewerLocationMarker.addTo(map);
              }
              map.setView(marker.getLatLng(), 17, { animate: true });
              setTimeout(() => marker.openPopup(), 250);
              if (notify) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: place.id }));
              }
            };
            if (markerClusterGroup) {
              markerClusterGroup.zoomToShowLayer(marker, openSelectedMarker);
            } else {
              openSelectedMarker();
            }
          }
        };
        window.showRoute = (placeId, coordinates) => {
          if (!placeById[String(placeId)] || !Array.isArray(coordinates) || coordinates.length < 2) {
            return;
          }
          const routeLatLngs = coordinates.map(([lng, lat]) => [lat, lng]);
          selectedRouteOutline.setLatLngs(routeLatLngs).addTo(map);
          selectedRouteLine.setLatLngs(routeLatLngs).addTo(map);
          selectedRouteOutline.bringToFront();
          selectedRouteLine.bringToFront();
        };
        window.clearRoute = () => {
          selectedRouteOutline.setLatLngs([]);
          selectedRouteLine.setLatLngs([]);
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
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const dataRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [voteData, setVoteData] = useState(null);
  const [voting, setVoting] = useState(false);
  const [finalizingPlaceId, setFinalizingPlaceId] = useState(null);
  const [centroidAddress, setCentroidAddress] = useState(null);
  const selectedRouteRef = useRef(null);
  const mapRef = useRef(null);
  const routeRequestRef = useRef(0);
  const mapHtml = useMemo(() => (data ? createMapHtml(data) : ''), [data]);
  const mapSource = useMemo(() => ({
    html: mapHtml,
    baseUrl: 'https://www.openstreetmap.org/',
  }), [mapHtml]);

  const fetchSuggestions = useCallback(async () => {
    if (dataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setMapReady(false);
    try {
      const result = await getSuggestions(token, groupId);
      dataRef.current = result;
      setData(result);
      setSuggestionsError(null);
    } catch (err) {
      setSuggestionsError(
        err.response?.data?.error || 'Không lấy được gợi ý. Kiểm tra kết nối hoặc thử lại sau.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, groupId]);

  const fetchVoteResults = useCallback(async () => {
    try {
      const result = await getVoteResults(token, groupId);
      setVoteData(result);
    } catch (err) {
      // bỏ qua lỗi polling, không làm phiền user
    }
  }, [token, groupId]);

  useFocusEffect(
    useCallback(() => {
      fetchSuggestions();
    }, [fetchSuggestions])
  );

  useFocusEffect(
    useCallback(() => {
      fetchVoteResults();
      const interval = setInterval(fetchVoteResults, 4000);
      return () => clearInterval(interval);
    }, [fetchVoteResults])
  );

  // Hiện địa chỉ thật cho điểm trung tâm thay vì toạ độ thô
  useEffect(() => {
    if (!data?.centroid) {
      setCentroidAddress(null);
      return;
    }
    reverseGeocode(token, { lat: data.centroid.lat, lng: data.centroid.lng })
      .then((res) => setCentroidAddress(res.address))
      .catch(() => setCentroidAddress(null)); // thất bại thì vẫn còn toạ độ để hiện
  }, [data?.centroid, token]);

  const selectPlace = (place) => {
    const placeId = String(place.id);
    setSelectedPlaceId(placeId);
    loadRouteForPlace(placeId);
    if (mapReady) {
      mapRef.current?.injectJavaScript(`window.selectPlace && window.selectPlace(${serializeForHtml(placeId)}, false); true;`);
    }
  };

  const loadRouteForPlace = async (placeId) => {
    const place = data?.suggestions.find((suggestion) => String(suggestion.id) === placeId);
    if (!place) {
      return;
    }
    if (!data?.viewerLocation) {
      Alert.alert('Chưa có vị trí của bạn', 'Hãy gửi vị trí trong nhóm để xem đường đi tới địa điểm này.');
      return;
    }

    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;
    selectedRouteRef.current = null;

    try {
      const routeResult = await getRouteToSuggestion(token, groupId, {
        lat: place.lat,
        lng: place.lng,
      });

      if (requestId !== routeRequestRef.current) {
        return;
      }

      const coordinates = serializeForHtml(routeResult.coordinates);
      selectedRouteRef.current = { placeId, coordinates };
      if (mapReady) {
        mapRef.current?.injectJavaScript(
          `window.showRoute && window.showRoute(${serializeForHtml(placeId)}, ${coordinates}); true;`
        );
      }
    } catch (err) {
      if (requestId !== routeRequestRef.current) {
        return;
      }

      mapRef.current?.injectJavaScript('window.clearRoute && window.clearRoute(); true;');
      Alert.alert(
        'Không tìm được đường đi',
        err.response?.data?.error || 'Dịch vụ chỉ đường tạm thời không khả dụng.'
      );
    }
  };

  const handleMapMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'select') {
        const placeId = String(message.id);
        setSelectedPlaceId(placeId);
        loadRouteForPlace(placeId);
      }
    } catch (error) {
      Alert.alert('Lỗi bản đồ', 'Không đọc được sự kiện chọn địa điểm từ bản đồ.');
    }
  };

  // ---- Vote ----
  const handleVote = async (place) => {
    if (voteData?.finalizedPlace) return;
    setVoting(true);
    try {
      const result = await castVote(token, {
        groupId,
        placeId: String(place.id),
        placeName: place.name,
        lat: place.lat,
        lng: place.lng,
      });
      setVoteData(result);
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.error || 'Không thể bình chọn, vui lòng thử lại.');
    } finally {
      setVoting(false);
    }
  };

  const handleFinalizePlace = (place) => {
    Alert.alert(
      'Chốt điểm hẹn?',
      `Chọn "${place.name}" làm điểm hẹn chính thức cho cả nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chốt điểm hẹn',
          onPress: async () => {
            setFinalizingPlaceId(String(place.id));
            try {
              const result = await finalizeMeetupPlace(token, {
                groupId,
                placeId: String(place.id),
                placeName: place.name,
                lat: place.lat,
                lng: place.lng,
                address: place.address,
              });
              setVoteData((current) => ({
                ...current,
                finalizedPlace: result.finalizedPlace,
                canFinalize: false,
              }));
            } catch (err) {
              Alert.alert('Lỗi', err.response?.data?.error || 'Không thể chốt điểm hẹn.');
            } finally {
              setFinalizingPlaceId(null);
            }
          },
        },
      ]
    );
  };

  // ---- Xem ảnh/review trên Google Maps trước khi vote ----
  const handleViewOnGoogleMaps = (place) => {
    const query = encodeURIComponent(`${place.name} ${place.address || ''}`.trim());
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(fallbackUrl));
  };

  const myUserId = user?.id || user?._id;

  return (
    <View style={styles.container}>

      {voteData?.finalizedPlace && (
        <View style={styles.finalizedBanner}>
          <Ionicons name="flag" size={18} color="#fff" />
          <Text style={styles.finalizedText}>
            Điểm hẹn đã chốt: {voteData.finalizedPlace.name}
          </Text>
        </View>
      )}

      {loading && !data && <ActivityIndicator style={{ marginTop: spacing.xl }} size="large" color={colors.primary} />}

      {suggestionsError && data && (
        <View style={styles.warningBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
          <Text style={styles.warningText}>{suggestionsError} Đang hiển thị kết quả gần nhất.</Text>
        </View>
      )}

      {!loading && !data && suggestionsError && (
        <View style={styles.errorBlock}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.danger} />
          <Text style={styles.errorTitle}>Chưa tải được gợi ý</Text>
          <Text style={styles.errorText}>{suggestionsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSuggestions} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {data && (
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
                  mapRef.current?.injectJavaScript(`window.selectPlace && window.selectPlace(${serializeForHtml(selectedPlaceId)}, false); true;`);
                }
                if (selectedRouteRef.current) {
                  const { placeId, coordinates } = selectedRouteRef.current;
                  mapRef.current?.injectJavaScript(
                    `window.showRoute && window.showRoute(${serializeForHtml(placeId)}, ${coordinates}); true;`
                  );
                }
              }}
              onMessage={handleMapMessage}
              onError={() => Alert.alert('Lỗi bản đồ', 'Không tải được bản đồ. Kiểm tra kết nối Internet và thử lại.')}
            />
          </View>

          <View style={[styles.centroidCard, shadow]}>
            <View style={styles.centroidIcon}>
              <Ionicons name="locate" size={19} color={colors.accent} />
            </View>
            <View style={styles.centroidCopy}>
              <Text style={styles.centroidLabel}>ĐIỂM TRUNG TÂM</Text>
              <Text style={styles.centroidValue} numberOfLines={2}>
                {centroidAddress || `${data.centroid.lat.toFixed(5)}, ${data.centroid.lng.toFixed(5)}`}
              </Text>
            </View>
          </View>

          <FlatList
            data={data.suggestions}
            keyExtractor={(item) => String(item.id)}
            style={{ marginTop: spacing.md, flex: 1 }}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}
            ListHeaderComponent={(
              <View>
                <View style={styles.suggestionsHeading}>
                  <Text style={styles.suggestionsTitle}>Điểm hẹn gợi ý</Text>
                  <Text style={styles.suggestionsCount}>{data.suggestions.length}</Text>
                </View>
                {!voteData?.finalizedPlace && (
                  <Text style={styles.voteHint}>
                    Bạn có thể đổi hoặc bỏ phiếu cho đến khi trưởng nhóm chốt điểm hẹn.
                  </Text>
                )}
              </View>
            )}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={fetchSuggestions}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            )}
            renderItem={({ item, index }) => {
              const voteEntry = voteData?.tally?.find((t) => t.placeId === String(item.id));
              const voteCount = voteEntry?.count || 0;
              const voterNames = voteEntry?.voterNames || [];
              const isMyVote = Boolean(myUserId && voteEntry?.voterIds?.includes(String(myUserId)));
              const isFinalized = !!voteData?.finalizedPlace;
              const isWinner = voteData?.finalizedPlace?.placeId === String(item.id);
              const visibleVoterNames = voterNames.slice(0, 3).join(', ');
              const additionalVoterCount = voterNames.length - 3;

              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: String(item.id) === selectedPlaceId }}
                  activeOpacity={0.8}
                  onPress={() => selectPlace(item)}
                  style={[
                    styles.placeRow,
                    shadow,
                    String(item.id) === selectedPlaceId && styles.selectedPlaceRow,
                    isWinner && styles.winnerPlaceRow,
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
                    <TouchableOpacity
                      style={styles.mapsLink}
                      onPress={() => handleViewOnGoogleMaps(item)}
                    >
                      <Ionicons name="image-outline" size={14} color={colors.primary} />
                      <Text style={styles.mapsLinkText}>Xem ảnh & review</Text>
                    </TouchableOpacity>
                    {voteCount > 0 && (
                      <View>
                        <Text style={styles.voteCountText}>
                          <Ionicons name="people" size={12} color={colors.accent} /> {voteCount} lượt bình chọn
                        </Text>
                        {voterNames.length > 0 && (
                          <Text style={styles.voterNamesText} numberOfLines={2}>
                            Đã chọn: {visibleVoterNames}
                            {additionalVoterCount > 0 ? ` và ${additionalVoterCount} người khác` : ''}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <View style={styles.distancePill}>
                      <Text style={styles.distanceText}>{item.distance.toFixed(2)} km</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.voteButton}
                      onPress={() => handleVote(item)}
                      disabled={isFinalized || voting}
                    >
                      <Ionicons
                        name={isMyVote ? 'checkmark-circle' : 'checkmark-circle-outline'}
                        size={24}
                        color={isMyVote ? colors.success : colors.textSecondary}
                      />
                      <Text style={styles.voteButtonLabel}>
                        {isMyVote ? 'Bỏ bình chọn' : 'Bình chọn'}
                      </Text>
                    </TouchableOpacity>
                    {voteData?.canFinalize && !isFinalized && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.finalizeButton}
                        onPress={() => handleFinalizePlace(item)}
                        disabled={Boolean(finalizingPlaceId)}
                      >
                        {finalizingPlaceId === String(item.id) ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Text style={styles.finalizeButtonLabel}>Chốt quán</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyBlock}>
                <Ionicons name="cafe-outline" size={32} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Chưa có địa điểm phù hợp</Text>
                <Text style={styles.emptyText}>Thử làm mới hoặc chia sẻ vị trí chính xác hơn.</Text>
              </View>
            }
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.refreshButton, (loading || refreshing) && styles.refreshButtonDisabled]}
        onPress={fetchSuggestions}
        disabled={loading || refreshing}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh" size={16} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.refreshText}>{loading || refreshing ? 'Đang cập nhật...' : 'Làm mới gợi ý'}</Text>
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
    borderRadius: radius.md,
    overflow: 'hidden',
    height: 210,
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  centroidCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  centroidIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: '#FCE9E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroidCopy: { flex: 1 },
  suggestionsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  voteHint: {
    ...typography.subtitle,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  suggestionsTitle: { ...typography.body, fontSize: 17, fontWeight: '800' },
  suggestionsCount: {
    color: colors.primary,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  centroidLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centroidValue: {
    ...typography.body,
    fontWeight: '700',
    marginTop: 3,
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
  winnerPlaceRow: {
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: '#F3F7EF',
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
  mapsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mapsLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  voteCountText: {
    fontSize: 12,
    color: colors.accent,
    marginTop: 4,
  },
  voterNamesText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  voteButton: {
    marginTop: 2,
    alignItems: 'center',
  },
  voteButtonLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  finalizeButton: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  finalizeButtonLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
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
  finalizedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: 6,
  },
  finalizedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: '#F8E4E1',
  },
  warningText: { flex: 1, color: colors.danger, fontSize: 12, lineHeight: 17 },
  errorBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: { ...typography.body, fontWeight: '700', marginTop: spacing.md },
  errorText: { ...typography.subtitle, textAlign: 'center', lineHeight: 20, marginTop: spacing.xs },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  retryText: { ...typography.button, color: colors.primary },
  emptyBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.subtitle,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
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
  refreshButtonDisabled: { opacity: 0.55 },
});