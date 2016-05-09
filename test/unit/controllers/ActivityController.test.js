var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var ActivityController = require(root('api/controllers/ActivityController'))
var PostController = require(root('api/controllers/PostController'))

const destroyAllActivities = () => {
  return Activity.fetchAll()
  .then(activities => activities.map(activity => activity.destroy()))
}

describe('ActivityController', () => {
  var req, res, fixtures

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
      .then(() => Promise.props({
        u1: factories.user().save(),
        u2: factories.user().save(),
        c1: factories.community().save(),
        c2: factories.community().save(),
        p1: factories.post().save(),
        p2: factories.post().save(),
        p3: factories.post().save()
      })
      .then(props => fixtures = props))
      .then(() => Promise.join(
        fixtures.c1.posts().attach(fixtures.p1),
        fixtures.c2.posts().attach(fixtures.p2),
        fixtures.c1.posts().attach(fixtures.p3)
      ))
  })

  describe('#find', () => {
    beforeEach(() => destroyAllActivities())

    it('returns an activity for a mention', () => {
      var postReq = factories.mock.request()
      var postRes = factories.mock.response()
      _.extend(postReq.params, {
        name: 'NewPost',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U2</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      postReq.session.userId = fixtures.u2.id
      req.session.userId = fixtures.u1.id
      return PostController.create(postReq, postRes)
      .then(() => ActivityController.find(req, res))
      .then(() => {
        expect(res.body).to.exist
        expect(res.body.length).to.equal(1)
        var activity = res.body[0]
        expect(activity).to.contain({
          actor_id: fixtures.u2.id,
          reader_id: fixtures.u1.id,
          comment_id: null,
          action: 'mention',
          unread: true,
          total: '1'
        })
        expect(activity.post).to.contain({
          name: 'NewPost',
          user_id: fixtures.u2.id,
          type: 'intention'
        })
        expect(activity.actor.id).to.equal(fixtures.u2.id)
      })
    })

    it('returns 3 activities', () => {
      var req1 = factories.mock.request()
      var res1 = factories.mock.response()
      _.extend(req1.params, {
        name: 'NewPost 1',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U1</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      req1.session.userId = fixtures.u2.id

      var req2 = factories.mock.request()
      var res2 = factories.mock.response()
      _.extend(req2.params, {
        name: 'NewPost 2',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U1</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      req2.session.userId = fixtures.u2.id

      var req3 = factories.mock.request()
      var res3 = factories.mock.response()
      _.extend(req3.params, {
        name: 'NewPost 3',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U1</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      req3.session.userId = fixtures.u2.id

      req.session.userId = fixtures.u1.id
      return PostController.create(req1, res1)
      .then(() => PostController.create(req2, res2))
      .then(() => PostController.create(req3, res3))
      .then(() => ActivityController.find(req, res))
      .then(() => {
        expect(res.body).to.exist
        expect(res.body.length).to.equal(3)
      })
    })
  })

  describe('#findForCommunity', () => {
    it('returns activities for the given community only', () => {
      var req1 = factories.mock.request()
      var res1 = factories.mock.response()
      _.extend(req1.params, {
        name: 'NewPost 1',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U1</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      req1.session.userId = fixtures.u2.id

      var req2 = factories.mock.request()
      var res2 = factories.mock.response()
      _.extend(req2.params, {
        name: 'NewPost 2',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U1</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c1.id]
      })
      req2.session.userId = fixtures.u2.id

      var req3 = factories.mock.request()
      var res3 = factories.mock.response()
      _.extend(req3.params, {
        name: 'NewPost 3, in a different community',
        description: '<p>Hey <a data-user-id="' + fixtures.u1.id + '">U1</a>, you\'re mentioned ;)</p>',
        type: 'intention',
        communities: [fixtures.c2.id]
      })
      req3.session.userId = fixtures.u2.id

      _.extend(req.params, {
        communityId: fixtures.c1.id
      })
      req.session.userId = fixtures.u1.id
      return PostController.create(req1, res1)
      .then(() => PostController.create(req2, res2))
      .then(() => PostController.create(req3, res3))
      .then(() => ActivityController.findForCommunity(req, res))
      .then(() => {
        expect(res.body).to.exist
        expect(res.body.length).to.equal(2)
        var postNames = res.body.map(activity => activity.post.name)
        expect(postNames.sort()).to.deep.equal(['NewPost 2', 'NewPost 1'].sort())
      })
    })
  })

  describe('#update', () => {
    it('sets unread to false', () => {
      req.session.userId = fixtures.u1.id

      return new Activity({
        reader_id: fixtures.u1.id,
        post_id: fixtures.p1.id,
        unread: true
      }).save()
      .then(activity => {
        _.extend(req.params, {
          activityId: activity.id,
          unread: false
        })
        return ActivityController.update(req, res)
        .then(() => Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p1.id}).fetch())
        .then(activity => {
          expect(activity).to.exist
          expect(activity.get('unread')).to.equal(false)
        })
      })
    })
  })

  describe('#markAllRead', () => {
    beforeEach(() => destroyAllActivities())

    it('marks logged in users activities as read', () => {
      req.session.userId = fixtures.u1.id

      return Promise.join(
        new Activity({
          reader_id: fixtures.u1.id,
          post_id: fixtures.p1.id,
          unread: true
        }).save(),
        new Activity({
          reader_id: fixtures.u1.id,
          post_id: fixtures.p2.id,
          unread: true
        }).save(),
        new Activity({
          reader_id: fixtures.u2.id,
          post_id: fixtures.p3.id,
          unread: true
        }).save())
        .then(() => ActivityController.markAllRead(req, res))
        .then(() => Promise.join(
          Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p1.id}).fetch(),
          Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p2.id}).fetch(),
          Activity.where({reader_id: fixtures.u2.id, post_id: fixtures.p3.id}).fetch(),
          (u1p1, u1p2, u2p3) => {
            expect(u1p1).to.exist
            expect(u1p1.get('unread')).to.equal(false)
            expect(u1p2).to.exist
            expect(u1p2.get('unread')).to.equal(false)
            expect(u2p3).to.exist
            expect(u2p3.get('unread')).to.equal(true)
          }))
    })

    describe('with communityId', () => {
      it('marks logged in users activities in the correct community as read', () => {
        req.session.userId = fixtures.u1.id

        _.extend(req.params, {
          communityId: fixtures.c1.id,
          unread: false
        })

        return Promise.join(
          new Activity({
            reader_id: fixtures.u1.id,
            post_id: fixtures.p1.id,
            unread: true
          }).save(),
          new Activity({
            reader_id: fixtures.u1.id,
            post_id: fixtures.p2.id,
            unread: true
          }).save(),
          new Activity({
            reader_id: fixtures.u2.id,
            post_id: fixtures.p3.id,
            unread: true
          }).save())
          .then(() => ActivityController.markAllRead(req, res))
          .then(() => Promise.join(
            Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p1.id}).fetch(),
            Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p2.id}).fetch(),
            Activity.where({reader_id: fixtures.u2.id, post_id: fixtures.p3.id}).fetch(),
            (u1p1, u1p2, u2p3) => {
              expect(u1p1).to.exist
              expect(u1p1.get('unread')).to.equal(false)
              expect(u1p2).to.exist
              expect(u1p2.get('unread')).to.equal(true)
              expect(u2p3).to.exist
              expect(u2p3.get('unread')).to.equal(true)
            }))
      })
    })
  })
})
