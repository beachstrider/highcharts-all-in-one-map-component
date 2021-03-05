// adapt json to chart input
const interested_over_time = json.interest_over_time.map(function (el) {
  return [
    Number(moment(el.label).format('x')),
    el.value
  ]
});

// get max & min point
let max_interest = interested_over_time[0];
let min_interest = interested_over_time[0];

for (const index in interested_over_time) {
  if (Object.hasOwnProperty.call(interested_over_time, index)) {
    const el = interested_over_time[index];
    if (el[1] > max_interest[1]) max_interest = el;
    if (el[1] < min_interest[1]) min_interest = el;
  }
}

// initialize chart
Highcharts.chart('highcharts-interest', {
  chart: {
    zoomType: 'x'
  },

  title: {
    text: ''
  },

  xAxis: {
    labels: {
      formatter: function () {
        return moment(this.value).format('MMM DD, YYYY');
      }
    }
  },

  yAxis: {
    title: {
      text: ''
    }
  },

  legend: {
    enabled: false
  },

  plotOptions: {
    area: {
      fillColor: {
        linearGradient: {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 1
        },
        stops: [
          [0, Highcharts.getOptions().colors[0]],
          [1, Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
        ]
      },
      marker: {
        radius: 2
      },
      lineWidth: 1,
      states: {
        hover: {
          lineWidth: 1
        }
      },
      threshold: null
    }
  },

  annotations: [
    {
      labels: [
        {
          point: {
            x: max_interest[0],
            y: max_interest[1],
            xAxis: 0,
            yAxis: 0
          },
          text: '{y}'
        }
      ]
    },
    {
      labels: [
        {
          point: {
            x: min_interest[0],
            y: min_interest[1],
            xAxis: 0,
            yAxis: 0
          },
          text: '{y}'
        }
      ]
    }
  ],

  tooltip: {
    useHTML: true,
    formatter: function () {
      return (`
        <div style='font-size: 10px;'>${moment(this.x).format('MMM DD, YYYY')}</div>
        <div style='font-size: 12px; font-weight: bold;'>Interest: ${this.y}</div>
      `)
    }
  },

  series: [{
    type: 'area',
    name: 'Interest',
    data: interested_over_time
  }],

  credits: {
    enabled: false
  },
});