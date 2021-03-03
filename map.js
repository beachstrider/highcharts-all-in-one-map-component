console.log("json", json);

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

// function used to calculate track record
const insertTrackRecords = function(data){
  let wins = 0;
  let losses = 0;

  for (let i = data.length - 1; i >= 0; i--) {
    if(data[i].winner)
      wins++;
    else
      losses++;
    data[i].trackRecord = `${wins}-${losses}`;
  }
  return data;
}

// function used to spidering overlapped positions
const spidering = function(data){
  const fr = 0.3; // coordinating offset
  const fn = 6; // point amount in first circle
  const _data = groupBy(data, el => [el.event.location.lat, el.event.location.long]); // groupping by same lat long
  console.log(_data);

  
  for(let i in _data){
    if(_data[i].length > 1){
      const lat = _data[i][0].event.location.lat;
      const long = _data[i][0].event.location.long;
      console.log(_data[i].length, 'lat long', lat, long);
      
      let r = fr;
      let n = fn;
      for(let j = 1; j < _data[i].length; j++){
        m = Math.ceil((Math.sqrt(1 + 8 * j / fn) - 1) / 2);
        r = fr * m;
        n = fn * m;
        const _lat = lat + r * Math.cos(2 * Math.PI * (j - 1) / n) * 0.9;
        const _long = long - r * Math.sin(2 * Math.PI * (j - 1) / n);
        _data[i][j].event.location.lat = _lat;
        _data[i][j].event.location.long = _long;
      }
      console.log(_data[i].map(el=>[el.event.location.lat, el.event.location.long]));
    }
  }

  return _data.flat();
}

// trends formatting
const trends = json.trends_by_region.map(function (el) {
  return {
    geoCode: el.geoCode,
    name: el.name,
    value: el.interest < 1 ? 1 : el.interest
  };
});

// insert calculated track record into every item of history
json.history = insertTrackRecords(json.history); 

// spidering json history
json.history = spidering(json.history);

// format history in order to adapt it for chart input
const history = json.history.map((el, key) => {
  const name = el.trackRecord;
  const lat = el.event.location.lat;
  const lon = el.event.location.long;
  const isFinish = el.method.name.includes('KO/TKO') || el.method.name.includes('Submission');
  const isWin = el.winner;
  let marker = {};

  if (isWin) {
    if(isFinish){
      marker.symbol = 'url(ko_green.png)';
    }else{
      marker.symbol = 'url(sb_green.png)';
    }
  } else {
    if(isFinish){
      marker.symbol = 'url(ko_red.png)';
    }else{
      marker.symbol = 'url(sb_red.png)';
    }
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
if (typeof json.born !== 'undefined') {
  locations.push(
    {
      type: 'Born Location',
      name: json.born.city,
      lat: json.born.lat + 0.05,
      lon: json.born.long - 0.05,
      marker: {
        symbol: 'url(location.png)'
      }
    }
  );
}
if (typeof json.twitter_data !== 'undefined') {
  locations.push(
    {
      type: 'Twitter Location',
      name: json.twitter_data.location.city,
      lat: json.twitter_data.location.lat - 0.05,
      lon: json.twitter_data.location.long - 0.05,
      data: json.twitter_data,
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
      if (this.point.series.name === "Google trends") {
        return `
          <span class="f16">
            <span class="flag ${this.point.properties['hc-key']}"></span>
          </span>
          <span style="margin-left: 3px;">${this.point.name}</span>
          <div>Google trends: ${this.point.value}</div>
        `;
      }else if(this.point.series.name === "Location"){
        console.log('this.point',this.point);
        if(this.point.type === 'Born Location'){
          return `
            <div>Personal info here...</div>
            <div></div>
            <div></div>
          `;
        }else if(this.point.type === 'Twitter Location'){
          return `
            <div>Followers count: ${this.point.data.followers_count}</div>
            <div>Following count: ${this.point.data.following_count}</div>
            <div>Tweet count: ${this.point.data.tweet_count}</div>
            <div>Listed count: ${this.point.data.listed_count}</div>
          `;
        }
      }else{
        return false;
      }

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
              e.target.classList.add('blinking');
            } else if (this.series.name === 'History') {
              e.target.classList.add('blinking');
              $('.item-history').removeClass('active');
              $(`.item-history[data-key="${this.index}"]`).addClass('active');
              $('.highchartmap-tooltip').animate({
                scrollTop: $(`.item-history[data-key="${this.index}"]`).offset().top - $('.item-history').offset().top + $('.item-history').scrollTop()
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

$('.highchartmap-tooltip').append(`
  <div class="highchart-profile-container">
    <div class="highchart-profile-flex">
      <img class="highchart-profile-image" src="${json.twitter_data.profile_image_url}">
      <div class="highchart-profile-image-text-wrapper">
        <div class="highchart-profile-title">${json.name}</div>
        <div class="highchart-profile-subtitle">(${json.nickname})</div>
        <div class="highchart-profile-text">Head coach: ${json.head_coach}</div>
        <div class="highchart-profile-text">Earnings: ${json.career_disclosed_earnings}</div>
        <div class="highchart-profile-text">Affiliation: ${json.affiliation}</div>
        <div class="highchart-profile-text">Birthday: ${moment(json.date_of_birth).format('MMM DD, YYYY')}</div>
      </div>
    </div>
  </div>
  <hr>
`);

$('.highchartmap-tooltip').append(
  json.history.map((el, key) => (`
    <div class="item-history" data-key="${key}">
      <div class="item-history-flex">
        <div class="item-history-content">
          <div class="item-history-title">
            (${el.trackRecord}) ${el.event.name}
          </div>
          <div class="item-history-subtitle">(${el.event.promotion})</div>
          <div class="item-history-time">
            ${moment(el.event.date).format('MMM DD, YYYY')} - dur: ${el.time}
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
            Method: ${el.method.name}
          </div>
          <div style="font-size: 12px;">
            ${el.rounds}  
          </div>
          <div style="
            display: block;
            font-size: 12px;
            text-indent: -66px;
            padding-left: 66px;
          ">
            Location: ${el.event.location.city}  
          </div>
          
        </div>
        <div class="item-history-image-wrapper">
          ${el.opponent_twitter_data !== null
            ? `
              <img class="item-history-opponent-image" src="
                ${el.opponent_twitter_data.profile_image_url}
              ">
            `
            : ''
          }
          <span class="item-history-game-result-circle ${el.winner ? 'winner' : 'losser'}"></span>
        </div>
      </div>
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
    .points.find(el => el.lat === data.event.location.lat && el.lon === data.event.location.long);
  const pos = map.fromLatLonToPoint({
    lat: data.event.location.lat,
    lon: data.event.location.long
  });
  const ele = $(".highcharts-point[x='" + point.plotX + "']");

  console.log('point', point);
  console.log('===', ".highcharts-point[x='" + point.plotX + "'][y='" + point.plotY + "']");
  console.log('length', ele.length);

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