$(document).ready(function () {
  window._token = $('meta[name="csrf-token"]').attr("content");

  moment.updateLocale("en", {
    week: { dow: 1 }, // Monday is the first day of the week
  });

  $(".date").datetimepicker({
    format: "YYYY-MM-DD",
    locale: "en",
    icons: {
      up: "fas fa-chevron-up",
      down: "fas fa-chevron-down",
      previous: "fas fa-chevron-left",
      next: "fas fa-chevron-right",
    },
  });

  $(".datetime").datetimepicker({
    format: "YYYY-MM-DD HH:mm:ss",
    locale: "en",
    sideBySide: true,
    icons: {
      up: "fas fa-chevron-up",
      down: "fas fa-chevron-down",
      previous: "fas fa-chevron-left",
      next: "fas fa-chevron-right",
    },
  });

  $(".timepicker").datetimepicker({
    format: "HH:mm:ss",
    icons: {
      up: "fas fa-chevron-up",
      down: "fas fa-chevron-down",
      previous: "fas fa-chevron-left",
      next: "fas fa-chevron-right",
    },
  });

  $(".select-all").click(function () {
    let $select2 = $(this).parent().siblings(".select2");
    $select2.find("option").prop("selected", "selected");
    $select2.trigger("change");
  });
  $(".deselect-all").click(function () {
    let $select2 = $(this).parent().siblings(".select2");
    $select2.find("option").prop("selected", "");
    $select2.trigger("change");
  });

  $(".select2").select2();

  $(".treeview").each(function () {
    var shouldExpand = false;
    $(this)
      .find("li")
      .each(function () {
        if ($(this).hasClass("active")) {
          shouldExpand = true;
        }
      });
    if (shouldExpand) {
      $(this).addClass("active");
    }
  });

  $('a[data-widget^="pushmenu"]').click(function () {
    setTimeout(function () {
      $($.fn.dataTable.tables(true)).DataTable().columns.adjust();
    }, 350);
  });
});

// goole map

class MapHandler {
  constructor(mapElementId, latInputId, lngInputId, searchBoxId) {
    this.mapElementId = mapElementId;
    this.latInput = document.getElementById(latInputId);
    this.lngInput = document.getElementById(lngInputId);
    this.searchBoxId = searchBoxId;
    this.currentMarker = null;
    this.staticMarker = null;
    this.searchMarkers = [];
    this.isStaticMarkerVisible = true;
    this.defaultLat = 29.978576788059428;
    this.defaultLng = 30.935669975032056;

    this.initEventListeners();
  }

  initEventListeners() {
    const addressTextarea = document.getElementById("address_ar");
    addressTextarea.addEventListener("blur", () => {
      const searchInput = document.getElementById(this.searchBoxId);
      searchInput.value = addressTextarea.value;
      this.triggerSearch();
    });
  }

  initMap() {
    this.map = new google.maps.Map(document.getElementById(this.mapElementId), {
      center: { lat: this.defaultLat, lng: this.defaultLng },
      zoom: 18,
      mapTypeId: "roadmap",
      mapTypeControl: false, // تعطيل زرار التحويل بين Map و Satelite
      fullscreenControl: false, // تعطيل زرار Full Screen
    });

    const staticLatLng = { lat: this.defaultLat, lng: this.defaultLng };
    this.staticMarker = new google.maps.Marker({
      map: this.map,
      position: staticLatLng,
      visible: true,
    });

    this.map.addListener("click", (e) => this.handleMapClick(e.latLng));
    this.initSearch();
    this.checkAndSetMarker();
  }

  handleMapClick(latLng) {
    if (this.isStaticMarkerVisible) {
      this.staticMarker.setMap(null);
      this.isStaticMarkerVisible = false;
    }

    this.clearMarkers();

    this.currentMarker = new google.maps.Marker({
      position: latLng,
      map: this.map,
    });

    this.updateInputs(latLng.lat(), latLng.lng());
  }

  updateInputs(lat, lng) {
    this.latInput.value = lat;
    this.lngInput.value = lng;
  }

  clearMarkers() {
    if (this.currentMarker) {
      this.currentMarker.setMap(null);
      this.currentMarker = null;
    }

    this.searchMarkers.forEach((marker) => marker.setMap(null));
    this.searchMarkers = [];
  }

  initSearch() {
    const input = document.getElementById(this.searchBoxId);
    const searchBox = new google.maps.places.SearchBox(input);

    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    this.map.addListener("bounds_changed", () => {
      searchBox.setBounds(this.map.getBounds());
    });

    searchBox.addListener("places_changed", () => {
      const places = searchBox.getPlaces();

      if (places.length == 0) {
        return;
      }

      this.clearMarkers();

      const bounds = new google.maps.LatLngBounds();

      places.forEach((place) => {
        if (!place.geometry || !place.geometry.location) {
          console.log("Returned place contains no geometry");
          return;
        }

        const marker = new google.maps.Marker({
          map: this.map,
          title: place.name,
          position: place.geometry.location,
        });

        this.searchMarkers.push(marker);

        this.updateInputs(
          place.geometry.location.lat(),
          place.geometry.location.lng()
        );

        if (place.geometry.viewport) {
          bounds.union(place.geometry.viewport);
        } else {
          bounds.extend(place.geometry.location);
        }
      });

      this.map.fitBounds(bounds);
      this.map.setCenter(bounds.getCenter());
    });

    google.maps.event.addListener(searchBox, "places_changed", () => {
      const places = searchBox.getPlaces();
      if (places.length === 0) return;

      const place = places[0];
      if (!place.geometry || !place.geometry.location) return;

      const latLng = place.geometry.location;
      this.updateInputs(latLng.lat(), latLng.lng());
      this.map.setCenter(latLng);

      if (this.currentMarker) {
        this.currentMarker.setMap(null);
      }

      this.currentMarker = new google.maps.Marker({
        position: latLng,
        map: this.map,
      });
    });

    // Listen for clicks on search results
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        google.maps.event.trigger(searchBox, "places_changed");
      }
    });
  }

  triggerSearch() {
    const input = document.getElementById(this.searchBoxId);
    const searchBox = new google.maps.places.SearchBox(input);
    google.maps.event.trigger(searchBox, "places_changed");
  }

  checkAndSetMarker() {
    const latValue = this.latInput.value;
    const lngValue = this.lngInput.value;

    if (latValue === "" || lngValue === "") {
      this.staticMarker.setMap(this.map);
      this.map.setCenter(this.staticMarker.getPosition());
      this.isStaticMarkerVisible = true;
    } else {
      const lat = parseFloat(latValue);
      const lng = parseFloat(lngValue);

      if (isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid latitude and longitude.");
        return;
      }

      const newLatLng = new google.maps.LatLng(lat, lng);

      this.currentMarker = new google.maps.Marker({
        position: newLatLng,
        map: this.map,
      });

      this.map.setCenter(newLatLng);
      this.isStaticMarkerVisible = false;
    }
  }
}

function initMap() {
  const mapHandler = new MapHandler("map", "lat", "lng", "pac-input");
  mapHandler.initMap();
}
