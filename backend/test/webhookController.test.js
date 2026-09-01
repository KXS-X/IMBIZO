const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const { verifyGitHubSignature } = require('../src/controllers/webhookController');

const secret = 'test-webhook-secret';
const payload = JSON.stringify({
  ref: 'refs/heads/main',
  head_commit: { message: 'Mise à jour du Kanban' }
});

function sign(body) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

test('accepte une signature GitHub valide', () => {
  assert.equal(verifyGitHubSignature(secret, sign(payload), payload), true);
});

test('refuse une signature GitHub invalide', () => {
  assert.equal(verifyGitHubSignature(secret, 'sha256=invalid', payload), false);
});

test('refuse une signature absente lorsqu’un secret est configuré', () => {
  assert.equal(verifyGitHubSignature(secret, undefined, payload), false);
});

test('autorise l’absence de signature lorsqu’aucun secret n’est configuré', () => {
  assert.equal(verifyGitHubSignature('', undefined, payload), true);
});
