import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {LitGoogleMapsApi} from './lit-google-maps-api';
import {LitGoogleMapMarker} from './lit-google-map-marker';
import {LitSelector} from './lit-selector';
import {Shape} from './shape';

@customElement('lit-google-map')
export class LitGoogleMap extends LitElement {

    /**
     * A Maps API key. To obtain an API key, see https://developers.google.com/maps/documentation/javascript/tutorial#api_key.
     */
    @property({type : String, attribute: 'api-key'})
    apiKey: string = '';

    /**
     * Version of the Google Maps API to use.
     */
    @property({type : String})
    version: string = '3.48';

    /**
     * If set, custom styles can be applied to the map.
     * For style documentation see https://developers.google.com/maps/documentation/javascript/reference#MapTypeStyle
    */
    @property({type : Object})
    styles: object = {};

    /**
     * A zoom level to set the map to.
     */
    @property({type : Number})
    zoom: number = 8;

    /**
     * If set, the zoom level is set such that all markers (google-map-marker children) are brought into view.
     */
    @property({type : Boolean, attribute: 'fit-to-markers'})
    fitToMarkers: boolean = false;

    /**
     * Map type to display. One of 'roadmap', 'satellite', 'hybrid', 'terrain'.
     */
    @property({type : String, attribute: 'map-type'})
    mapType: string = 'roadmap';

    @property({type : Number, attribute: 'center-latitude'})
    centerLatitude: number = -34.397;

    @property({type : Number, attribute: 'center-longitude'})
    centerLongitude: number = 150.644;

    @property({type : String})
    language: string = '';

    @property({type : String, attribute: 'map-id'})
    mapId: string = '';

    map : google.maps.Map = null;

    markers : Array<Node>;
    shapes : Array<Node>;

    marketObserverSet : boolean;

    initGMap() {
        if (this.map != null) {
            return; // already initialized
        }

        var gMapApiElement = this.shadowRoot.getElementById('api') as LitGoogleMapsApi;

        if (gMapApiElement == null || gMapApiElement.libraryLoaded != true) {
            return;
        }

        this.map = new google.maps.Map(this.shadowRoot.getElementById('map'), this.getMapOptions());

        this.updateMarkers();
        this.updateShapes();
    }

    getMapOptions() : google.maps.MapOptions {
        return {
            zoom: this.zoom,
            center: {lat: this.centerLatitude, lng: this.centerLongitude},
            mapTypeId: this.mapType,
            // @ts-ignore
            styles: this.styles,
            mapId: this.mapId
        };
    }

    mapApiLoaded() {
        this.initGMap();
    }

    connectedCallback() {
        super.connectedCallback();

        this.initGMap();
    }

    attachChildrenToMap(children : Array<Node>) {
        if (this.map) {
          for (let child of children) {
            (child as LitGoogleMapMarker).changeMap(this.map);
          }
        }
    }

    observeMarkers() {
        if (this.marketObserverSet)
            return;

        this.addEventListener("selector-items-changed", event => { this.updateMarkers() });
        this.marketObserverSet = true;
    }

    updateMarkers() {
        this.observeMarkers();

        var markersSelector = this.shadowRoot.getElementById("markers-selector") as LitSelector;
        if (!markersSelector)
            return;

        var newMarkers = markersSelector.items;

        // do not recompute if markers have not been added or removed
        if (this.markers && newMarkers.length === this.markers.length)
        {
            var added = newMarkers.filter(m => {
                return this.markers && this.markers.indexOf(m) === -1;
            });
            if (added.length == 0)
                return
        }

        this.markers = newMarkers;

        this.attachChildrenToMap(this.markers);

        if (this.fitToMarkers) {
            this.fitToMarkersChanged();
        }
    }

    updateShapes() {
        var shapesSelector = this.shadowRoot.getElementById("shapes-selector") as LitSelector;
        if (!shapesSelector)
            return;

        this.shapes = shapesSelector.items;

        for (let s of this.shapes) {
            (s as unknown as Shape).attachToMap(this.map);
        }
    }

    fitToMarkersChanged() {
        if (this.map && this.fitToMarkers && this.markers.length > 0) {
            var latLngBounds = new google.maps.LatLngBounds();
            for (var marker of this.markers) {
                latLngBounds.extend(new google.maps.LatLng((marker as LitGoogleMapMarker).latitude, (marker as LitGoogleMapMarker).longitude));
            }

            // For one marker, don't alter zoom, just center it.
            if (this.markers.length > 1) {
                this.map.fitBounds(latLngBounds);
            }

            this.map.setCenter(latLngBounds.getCenter());
        }
    }

    deselectMarker(event : Event) {
    }
    
    deselectShape(event : Event) {
    }

    static styles = css`
        #map {
            width: 100%;
            height: 100%;
        }
        .gm-ui-hover-effect>span {
            background-color: #000;
        }
        .gmnoprint[role="menubar"] ul[role="menu"] {
            border-top-left-radius: 2px!important;
            border-top-right-radius: 2px!important; 
            border-bottom-left-radius: 0px!important;
            border-bottom-right-radius: 0px!important;
            top: -37px!important;
        }
    `;

    render() {
        return html`
            <lit-google-maps-api 
                id="api" 
                api-key="${this.apiKey}" 
                version="${this.version}"
                language="${this.language}"
                map-id="${this.mapId}"
                @api-load=${() => this.mapApiLoaded()}>
            </lit-google-maps-api>
            <lit-selector 
                id="markers-selector"
                selected-attribute="open"
                activate-event="google-map-marker-open"
                @google-map-marker-close=${(e) => this.deselectMarker(e)}>
                    <slot id="markers" name="markers"></slot>
            </lit-selector>
            <lit-selector 
                id="shapes-selector"
                selected-attribute="open"
                activate-event="google-map-shape-open"
                @google-map-shape-close=${(e) => this.deselectShape(e)}>
                    <slot id="shapes" name="shapes"></slot>
            </lit-selector>
            <div id="map">
            </div>
        `;
    }
}