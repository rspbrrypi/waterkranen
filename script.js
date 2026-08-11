        // --- HAMBURGER MENU INTERACTIE ---
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        const navLinks = document.getElementById('navLinks');

        hamburgerBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Sluit het mobiele menu zodra er op een link wordt geklikt
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });

        function parseCoordinaat(val, type) {
            if (val === undefined || val === null || val === '') return NaN;
            
            let str = String(val).replace(',', '.').trim();
            
            if (!str.includes('.')) {
                if (type === 'lat' && str.startsWith('52')) {
                    str = str.substring(0, 2) + '.' + str.substring(2);
                } else if (type === 'lng' && str.startsWith('4')) {
                    str = str.substring(0, 1) + '.' + str.substring(1);
                }
            }
            
            return parseFloat(str);
        }

        // --- HOOFD OVERZICHTSKAART INITIALISEREN ---
        // Check of de gebruiker op een mobiel apparaat zit
        const isMobile = window.innerWidth <= 640;
        const mainOverviewMap = L.map('main-overview-map', {
            zoomControl: true,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: false,
            tap: true
        }).setView([52.3936, 4.9009], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mainOverviewMap);

        const allMarkersGroup = L.featureGroup().addTo(mainOverviewMap);

        fetch('kranen_def.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Status code: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const container = document.getElementById('container');
                container.innerHTML = '';

                // --- 1. VERWERK ALLE KRANEN OP DE HOOFDOVERZICHTSKAART ---
                data.forEach(kraan => {
                    const latParsed = parseCoordinaat(kraan.latitude, 'lat');
                    const lngParsed = parseCoordinaat(kraan.longitude, 'lng');

                    if (!isNaN(latParsed) && !isNaN(lngParsed)) {
                        const fidRaw = kraan.FID !== undefined ? String(kraan.FID) : '';
                        let fidGetal = 'ONBEKEND';
                        if (fidRaw.includes('.')) {
                            fidGetal = fidRaw.split('.').pop();
                        } else if (fidRaw !== '') {
                            fidGetal = fidRaw;
                        }

                        let fotoNaam = kraan.foto ? String(kraan.foto).trim() : '';
                        if (fotoNaam.startsWith('/')) fotoNaam = fotoNaam.substring(1);
                        if (fotoNaam && !fotoNaam.startsWith('img/')) fotoNaam = 'img/' + fotoNaam;

                        // Marker toevoegen op de overzichtskaart
                        const marker = L.circleMarker([latParsed, lngParsed], {
                            radius: 8,
                            color: '#FFFFFF',
                            fillColor: '#0284c7',
                            fillOpacity: 0.9,
                            weight: 2
                        });

                        const popupHtml = `
                            <div class="map-popup-content">
                                <h3>Kraan ${fidGetal}</h3>
                                ${fotoNaam ? `<img src="${fotoNaam}" alt="Kraan ${fidGetal}" onerror="this.style.display='none'">` : ''}   
                                <div class="coordinates">LAT: ${latParsed} | LNG: ${lngParsed}</div>                            
                                <p style="font-size:0.8em; margin: 4px 0 10px 0; color: #475569;">${kraan.beschrijvi || ''}</p>                                
                                <button onclick="openModal('${fidGetal}')">Adopteer Kraan ${fidGetal}</button>
                            </div>
                        `;

                        marker.bindPopup(popupHtml);
                        allMarkersGroup.addLayer(marker);
                    }
                });

                // Pas het kaartbeeld automatisch aan de grenzen van alle kranen aan
                if (allMarkersGroup.getLayers().length > 0) {
                    mainOverviewMap.fitBounds(allMarkersGroup.getBounds().pad(0.12), {
                            maxZoom: 15,
                            animate: false
                        });
                    }
                // Leaflet opnieuw laten berekenen nadat de kaart zichtbaar is.
                requestAnimationFrame(() => mainOverviewMap.invalidateSize());

                // --- 2. RENDER ENKEL KRANEN MET FOTO IN DE RASTER-CARDS ---
                const kranenMetFoto = data.filter(item => item.foto && String(item.foto).trim() !== "");

                if (kranenMetFoto.length === 0) {
                    container.innerHTML = "<p style='text-align:center; color:#ffffff;'>Geen objecten met foto's gevonden.</p>";
                    return;
                }

                kranenMetFoto.forEach((kraan, index) => {
                    const card = document.createElement('div');
                    card.className = 'card';

                    const fidRaw = kraan.FID !== undefined ? String(kraan.FID) : '';
                    let fidGetal = 'ONBEKEND';

                    if (fidRaw.includes('.')) {
                        const parts = fidRaw.split('.');
                        fidGetal = parts[parts.length - 1];
                    } else if (fidRaw !== '') {
                        fidGetal = fidRaw;
                    }

                    const topContent = document.createElement('div');

                    // --- FID TITEL ---
                    const fidTitle = document.createElement('h2');
                    fidTitle.className = 'fid-title';
                    fidTitle.textContent = `Kraan ${fidGetal}`;
                    topContent.appendChild(fidTitle);

                    // --- MEDIA CONTAINER (FOTO + OVERLAY KAART) ---
                    const mediaContainer = document.createElement('div');
                    mediaContainer.className = 'media-container';

                    let fotoNaam = String(kraan.foto).trim();
                    if (fotoNaam.startsWith('/')) fotoNaam = fotoNaam.substring(1);
                    if (!fotoNaam.startsWith('img/')) fotoNaam = 'img/' + fotoNaam;

                    const img = document.createElement('img');
                    img.src = fotoNaam;
                    img.alt = `Kraan #${fidGetal}`;
                    img.onerror = function() {
                        this.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'><rect width='100%' height='100%' fill='%23e0f2fe'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%230284c7' font-family='sans-serif' font-size='16' font-weight='bold'>FOTO NIET GEVONDEN</text></svg>";
                    };
                    mediaContainer.appendChild(img);

                    // Mini Kaart Floating Wrapper
                    const mapWrapper = document.createElement('div');
                    mapWrapper.className = 'map-wrapper';
                    mapWrapper.title = "Klik om de kaart te vergroten";

                    const mapDiv = document.createElement('div');
                    mapDiv.className = 'map-container';
                    const mapId = `map-${index}`;
                    mapDiv.id = mapId;
                    mapWrapper.appendChild(mapDiv);

                    const badge = document.createElement('div');
                    badge.className = 'map-badge';
                    badge.textContent = '📍 Kaart';
                    mapWrapper.appendChild(badge);

                    mediaContainer.appendChild(mapWrapper);
                    topContent.appendChild(mediaContainer);

                    // --- COÖRDINATEN ---
                    const latParsed = parseCoordinaat(kraan.latitude, 'lat');
                    const lngParsed = parseCoordinaat(kraan.longitude, 'lng');

                    const latDisplay = !isNaN(latParsed) ? latParsed : (kraan.latitude || 'Onbekend');
                    const lngDisplay = !isNaN(lngParsed) ? lngParsed : (kraan.longitude || 'Onbekend');

                    const coordsDiv = document.createElement('div');
                    coordsDiv.className = 'coordinates';
                    coordsDiv.innerHTML = `LAT: ${latDisplay} | LNG: ${lngDisplay}`;
                    topContent.appendChild(coordsDiv);

                    card.appendChild(topContent);

                    // --- DETAILS ---
                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'details';
                    const beschrijvingTekst = kraan.beschrijvi || 'Geen extra informatie beschikbaar.';
                    detailsDiv.innerHTML = `<strong>Details</strong>${beschrijvingTekst}`;
                    topContent.appendChild(detailsDiv);

                    

                    // --- KNOP ---
                    const adoptBtn = document.createElement('button');
                    adoptBtn.className = 'adopt-btn';
                    adoptBtn.textContent = 'Deze adopteer ik';
                    adoptBtn.onclick = function() {
                        openModal(fidGetal);
                    };
                    card.appendChild(adoptBtn);

                    container.appendChild(card);

                    // --- LEAFLET KAART & KLIK INTERACTIE VOOR LOSSE CARDS ---
                    setTimeout(() => {
                        const validLat = !isNaN(latParsed) ? latParsed : 52.3936;
                        const validLng = !isNaN(lngParsed) ? lngParsed : 4.9009;

                        const map = L.map(mapId, {
                            zoomControl: false,
                            attributionControl: false,
                            doubleClickZoom: false
                        }).setView([validLat, validLng], 14);

                        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                            maxZoom: 19
                        }).addTo(map);

                        if (!isNaN(latParsed) && !isNaN(lngParsed)) {
                            L.circleMarker([latParsed, lngParsed], {
                                radius: 7,
                                color: '#FFFFFF',
                                fillColor: '#3B82F6',
                                fillOpacity: 1,
                                weight: 2.5
                            }).addTo(map);
                        }

                        mapWrapper.addEventListener('click', function(e) {
                            e.stopPropagation();
                            
                            const isExpanded = mapWrapper.classList.contains('expanded');

                            if (!isExpanded) {
                                mapWrapper.classList.add('expanded');
                                mapWrapper.title = "Dubbelklik snel om de kaart te sluiten";
                                badge.textContent = '✖ Dubbelklik om te sluiten';

                                setTimeout(() => {
                                    map.invalidateSize();
                                    map.setView([validLat, validLng], 13);
                                }, 300);
                            }
                        });

                        mapWrapper.addEventListener('dblclick', function(e) {
                            e.stopPropagation();

                            const isExpanded = mapWrapper.classList.contains('expanded');

                            if (isExpanded) {
                                mapWrapper.classList.remove('expanded');
                                mapWrapper.title = "Klik om de kaart te vergroten";
                                badge.textContent = '📍 Kaart';

                                setTimeout(() => {
                                    map.invalidateSize();
                                    map.setView([validLat, validLng], 15);
                                }, 300);
                            }
                        });

                    }, 50);
                });
            })
            .catch(error => {
                console.error('Fout details:', error);
                document.getElementById('container').innerHTML = `<p style="color:#ffffff; text-align:center;">Fout bij het laden van kranen_def.json: ${error.message}</p>`;
            });
        let overviewResizeTimer;

        window.addEventListener('resize', () => {
            clearTimeout(overviewResizeTimer);

            overviewResizeTimer = setTimeout(() => {
                mainOverviewMap.invalidateSize({ pan: false });
            }, 150);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                mainOverviewMap.invalidateSize({ pan: false });
            }, 300);
        });
        function openModal(fid) {
            document.getElementById('kraanFid').value = `${fid}`;
            document.getElementById('adoptModal').style.display = 'flex';
        }

        function sluitModal() {
            document.getElementById('adoptModal').style.display = 'none';
            document.getElementById('adoptForm').reset();
        }

        window.onclick = function(event) {
            const modal = document.getElementById('adoptModal');
            if (event.target === modal) {
                sluitModal();
            }
        }