
// function used to group overlapped pins
const groupBy = function (array, f) {
  var groups = {};
  array.forEach(function (o) {
    var group = JSON.stringify(f(o));
    groups[group] = groups[group] || [];
    groups[group].push(o);
  });
  return Object.keys(groups).map(function (group) {
    return groups[group];
  })
};

// trends formatting
const trends = json.trends_by_region.map(function (el) {
  return {
    geoCode: el.geoCode,
    name: el.name,
    value: el.interest < 1 ? 1 : el.interest
  };
});

// history formatting
const history = groupBy(json.history, (el) => [el.location.lat, el.location.lon]).map((el) => {
  const single = el.length === 1;
  const name = single ? el[0].event.name : el.length + ' fights overlapped';
  const lat = el[0].location.lat;
  const lon = el[0].location.long;
  let marker = {};
  marker.symbol = 'diamond';
  if (single) {
    if (el[0].winner) {
      marker.fillColor = '#29a329';
    } else {
      marker.fillColor = '#ff4d4d';
    }
  } else {
    marker.symbol = 'square';
    marker.fillColor = '#000';
  }

  return {
    name: name,
    lat: lat,
    lon: lon,

    data: el,

    marker: marker
  };
});

// locations formatting
const locations = [];
// valication
if (json.birth_location !== null) {
  locations.push(
    {
      type: 'Birth Location',
      name: json.birth_location.city,
      lat: json.birth_location.lat,
      lon: json.birth_location.long,
      marker: {
        symbol: 'url(location.png)'
      }
    }
  );
}
if (json.twitter_location !== null) {
  locations.push(
    {
      type: 'Twitter Location',
      name: '',
      lat: json.twitter_location.lat,
      lon: json.twitter_location.long,
      marker: {
        symbol: 'url(twitter.png)'
      }
    },
  );
}

const map = Highcharts.mapChart('highchartmap-container', {
  chart: {
    map: 'custom/world',
    borderWidth: 1,
    animation: false,
    events: {
      load: function () {
        const latLons =
          history.map(
            el => ({ lat: el.lat, lon: el.lon })
          ).concat(
            locations.map(
              el => ({ lat: el.lat, lon: el.lon })
            )
          );

        const minLat = Math.min(...latLons.map(el => el.lat));
        const maxLat = Math.max(...latLons.map(el => el.lat));
        const centerLat = (minLat + maxLat) / 2;

        const minLon = Math.min(...latLons.map(el => el.lon));
        const maxLon = Math.max(...latLons.map(el => el.lon));
        const centerLon = (minLon + maxLon) / 2;

        const posCenter = this.fromLatLonToPoint({
          lat: centerLat,
          lon: centerLon
        });
        const posMin = this.fromLatLonToPoint({
          lat: minLat,
          lon: minLon
        });
        const posMax = this.fromLatLonToPoint({
          lat: maxLat,
          lon: maxLon
        });

        const distanceX = Math.abs(posMax.x - posMin.x);
        const distanceY = Math.abs(posMax.y - posMin.y);

        const rangeX = Math.abs(this.xAxis[0].max - this.xAxis[0].min);
        const rangeY = Math.abs(this.yAxis[0].max - this.yAxis[0].min);
        const zoomLevelX = distanceX / rangeX;
        const zoomLevelY = distanceY / rangeY;
        const zoomLevel = Math.max(zoomLevelX, zoomLevelY) / 0.9;

        this.mapZoom(zoomLevel, posCenter.x, posCenter.y);
      },
      click: function (e) {
      }
    }
  },

  credits: {
    enabled: false
  },

  legend: { enabled: false },

  title: {
    text: ''
  },

  mapNavigation: {
    enabled: true,
    buttonOptions: {
      verticalAlign: 'top'
    }
  },

  tooltip: {
    useHTML: true,
    formatter: function () {
      if (this.point.series.name !== "Google trends") {
        return false;
      }

      return `
        <span class="f16">
          <span class="flag ${this.point.properties['hc-key']}"></span>
        </span>
        <span style="margin-left: 3px;">${this.point.name}</span>
        <div>Google trends: ${this.point.value}</div>
      `;
    },
  },

  colorAxis: {
    min: 0,
    stops: [
      [0, '#EFEFFF'],
      [0.5, Highcharts.getOptions().colors[0]],
      [1, Highcharts.color(Highcharts.getOptions().colors[0]).brighten(-0.5).get()]
    ]
  },

  plotOptions: {
    series: {
      stickyTracking: false,
      cursor: 'pointer',
      point: {
        marker: {
          states: {
            hover: {
              enabled: false
            },
          }
        },
        events: {
          click: function (e) {
            document.querySelectorAll('.highcharts-point').forEach(el => {
              el.classList.remove('blinking');
            });

            if (this.series.name === 'Location') {
              map.mapZoom(1, this.x, this.y);
              e.target.classList.add('blinking');
            } else if (this.series.name === 'History') {
              map.mapZoom(1, this.x, this.y);
              e.target.classList.add('blinking');
              $('.item-history').removeClass('active');

              const matchedOriginalHistory = json.history.map((el, key) => ({
                index: key,
                ...el
              })).filter(
                el => (
                  el.location.lat === this.lat && el.location.long === this.lon
                )
              );

              matchedOriginalHistory.map(el => {
                $(`.item-history[data-key="${el.index}"]`).addClass('active');
              });
              $('.highchartmap-tooltip').animate({
                scrollTop: $('.item-history').eq(matchedOriginalHistory[0].index).offset().top - $('.item-history').offset().top + $('.item-history').scrollTop()
              });
            } else {
              return;
            }
          },
        }
      }
    }
  },

  series: [
    {
      mapData: Highcharts.maps['custom/world']
    },

    { // History
      type: 'mappoint',
      name: 'History',
      zIndex: 30,
      lineWidth: 1,
      color: 'rgba(0, 51, 204, 0.3)',

      marker: {
        radius: 6,
      },

      data: history,
    },

    { // Location
      type: 'mappoint',
      name: 'Location',
      zIndex: 40,

      marker: {
        fillColor: '#0F0'
      },

      data: locations
    },


    { // Trends
      data: trends,
      joinBy: ['iso-a2', 'geoCode'],
      name: 'Google trends',
      states: {
        hover: {
          color: '#a4edba'
        }
      },
    },
  ],
});

$('.highchartmap-tooltip').append(
  json.history.map((el, key) => (`
    <div class="item-history" data-key="${key}">
      <div class="item-history-title">
        ${el.event.name}
      </div>
      <div class="item-history-subtitle">(${el.event.promotion})</div>
      <div class="item-history-time">
        ${moment(el.event.date).format('MMM DD, YYYY')} - dur: ${el.time}
      </div>
      <div style="font-size: 12px;">
        Fighter: 
          ${el.winner
      ? el.winning_fighter_name
      : el.losing_fighter_name
    }
      </div>         
      <div style="font-size: 12px;">
        Opponent: 
          ${el.winner
      ? el.losing_fighter_name
      : el.winning_fighter_name
    }
      </div>
      <div style="font-size: 12px;">
        Game Result: ${el.winner ? 'Win' : 'Lose'}  
      </div>
      <div style="font-size: 12px;">
        ${el.rounds}  
      </div>
      <div style="
        display: block;
        font-size: 12px;
        text-indent: -66px;
        padding-left: 66px;
        max-width: 160px;
      ">
        Location: ${el.location.city}  
      </div>
      
      <div class=""></div>
    </div>
  `)).join('')
);

$('.highchartmap-bottom-pane').append(
  locations.map((el, key) => (`
    <div data-key="${key}">${el.type}</div>
  `)).join('')
);

$(document).on('click', '.highchartmap-tooltip .item-history', function () {
  const data = json.history[$(this).data('key')];
  const point = 
    map.series
    .find(el => el.name === 'History')
    .points.find(el => el.lat === data.location.lat && el.lon === data.location.long);
  const pos = map.fromLatLonToPoint({
    lat: data.location.lat,
    lon: data.location.long
  });
  const ele = $("path.highcharts-point[d='" + point.graphic.d + "']");

  $('.highchartmap-tooltip .item-history').removeClass('active');
  $(this).addClass('active');
  
  map.mapZoom(1, pos.x, pos.y);
  ele.addClass('blinking');
});

$(document).on('click', '.highchartmap-bottom-pane > div', function(){
  const data = locations[$(this).data('key')];
  const pos = map.fromLatLonToPoint({
    lat: data.lat,
    lon: data.lon
  });
  const ele = $("image.highcharts-point");
  console.log("image.highcharts-point[href='" + data.marker.symbol.substring(4, data.marker.symbol.length - 1) + "']");
  console.log(ele.length);
  $('.highchartmap-tooltip .item-history').removeClass('active');
  $(this).addClass('active');
  
  map.mapZoom(1, pos.x, pos.y);

  ele.each((key, el) => {
    console.log('href', $(el).attr('href'));
    if($(el).attr('href') === data.marker.symbol.substring(4, data.marker.symbol.length - 1)){
      $(el).addClass('blinking');
      return false;
    }
  });
})