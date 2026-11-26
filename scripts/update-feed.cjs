const UPDATE_FEEDS = {
  local: 'https://weilaidong.oss-cn-beijing.aliyuncs.com/esports-updata-local/',
  dev: 'https://weilaidong.oss-cn-beijing.aliyuncs.com/esports-updata-dev/',
  test: 'https://weilaidong.oss-cn-beijing.aliyuncs.com/esports-updata-test/',
  staging: 'https://weilaidong.oss-cn-beijing.aliyuncs.com/esports-updata-uat/',
  prod: 'https://weilaidong.oss-cn-beijing.aliyuncs.com/esports-updata/',
};

function getUpdateFeedUrl(environment = process.env.VITE_APP_ENV || 'prod') {
  const url = UPDATE_FEEDS[environment] || UPDATE_FEEDS.prod;
  return url.endsWith('/') ? url : `${url}/`;
}

module.exports = { getUpdateFeedUrl };
