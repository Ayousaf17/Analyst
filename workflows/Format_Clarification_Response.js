const plan = $json.plan[0];
const question = plan.question;
const channel = $json.channel;
const threadTs = $json.thread_ts;
const correlationId = $json.correlation_id;

console.log('❓ Sending clarification question to Slack:', question);

return [{
  json: {
    text: `❓ ${question}`,
    channel: channel,
    thread_ts: threadTs,
    correlation_id: correlationId
  }
}];
