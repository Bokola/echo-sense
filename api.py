from datetime import datetime, timedelta
from google.appengine.ext import db, blobstore, deferred
from google.appengine.ext.webapp import blobstore_handlers
from google.appengine.api import images, taskqueue, mail, search
import logging
from models import *
import cloudstorage as gcs
import tools
import services
import messages
import authorized

import json

import handlers


class PublicAPI(handlers.JsonRequestHandler):

    @authorized.role()
    def enterprise_lookup(self, key_or_alias, d):
        e = None
        type = self.request.get('type', default_value='key')
        try:
            if type == 'key':
                e = Enterprise.get(key_or_alias)
            elif type == 'alias':
                e = Enterprise.Get(alias=key_or_alias)
        except Exception, e:
            pass
        success = e is not None
        message = None
        data = {
            'enterprise': e.json() if e else None
        }
        self.json_out(data=data, message=message, success=success, debug=True)

    @authorized.role()
    def forgot_password(self, email_or_phone, d):
        import outbox
        success = False
        override_sitename = self.request.get('override_sitename')
        if email_or_phone:
            user = User.FuzzyGet(email_or_phone)
            if user:
                via_email = '@' in email_or_phone
                if via_email and user.email or not via_email and user.phone:
                    if tools.not_throttled("PW_RESET_%s" % user.key().id()):
                        new_password = user.setPass()
                        user.put()
                        success = True
                        if tools.on_dev_server():
                            logging.debug(new_password)
                        reset_message = "Your password has been reset: %s. You can change this upon signing in." % new_password
                        if via_email:
                            # Send via email
                            prefix = EMAIL_PREFIX if not override_sitename else "[ %s ] " % override_sitename
                            deferred.defer(mail.send_mail, SENDER_EMAIL, user.email, prefix + "Password Reset", reset_message)
                            message = "A new password is being sent to your email"
                        else:
                            # Send via SMS
                            message = "A new password is being sent via SMS"
                            outbox.send_sms(user.enterprise, user.phone, reset_message)
                    else:
                        message = "Too many password requests -- please try again later"
                else:
                    message = "No email/phone on file -- can't reset"
            else:
                message = "User not found..."
        else:
            message = "Email or phone required"
        self.json_out(success=success, message=message)

class InviteAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def invite(self, d):
        # User invites another email. Generate a code, and email recipient.
        success = False
        message = None
        email = self.request.get('email')
        ui, message = UserInvite.Create(email, inviter=d['user'])
        if ui:
            ui.put()
            self.add_message("Invite sent to %s" % email)
            success = True
            content = messages.EMAILS.CONTENT.get(messages.EMAILS.USER_INVITE)
            if content:
                deferred.defer(mail.send_mail, sender=SENDER_EMAIL, to=email, subject=content.get('subject') % (d['user'], SITENAME), body=content.get('body') % (ui.code, BASE))
            deferred.defer(mail.send_mail, SENDER_EMAIL, NOTIF_EMAILS, EMAIL_PREFIX + "%s sent an invite" % d['user'], "Invited email: %s" % email)
        self.json_out({}, success=success, message=message)

class EnterpriseAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        message = None
        ents = Enterprise.all().fetch(100)
        success = True
        data = {
            'enterprises': [ent.json() for ent in ents]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        """
        success = False
        message = None
        ent = None
        key = self.request.get('key')
        params = tools.gets(self, strings=['name','country','timezone','alias'],
            integers=['default_sensortype'], json=['gateway_config'], ignoreMissing=True)
        if key:
            ent = Enterprise.get(key)
        elif params.get('name'):
            ent = Enterprise.Create()
        if ent:
            ent.Update(**params)
            ent.put()
            success = True
        else:
            message = "Malformed"
        data = {
            'enterprise': ent.json() if ent else None
            }
        self.json_out(data, message=message, success=success)

    @authorized.role('api')
    def delete(self, d):
        success = False
        message = None
        key = self.request.get('key')
        if key:
            ent = Enterprise.get(key)
            if ent:
                ent.clean_delete()
                success = True
        else:
            message = "Malformed"
        self.json_out(message=message, success=success)

    @authorized.role('api')
    def detail(self, key_or_alias, d):
        e = None
        type = self.request.get('type', default_value='key')
        if type == 'key':
            e = Enterprise.get(key_or_alias)
        elif type == 'alias':
            e = Enterprise.Get(alias=key_or_alias)
        success = e is not None
        message = None
        data = {
            'enterprise': e.json() if e else None
        }
        self.json_out(data=data, message=message, success=success)


class UserAPI(handlers.JsonRequestHandler):
    """
    """
    @authorized.role('api')
    def list(self, d):
        message = None
        page, max, offset = tools.paging_params(self.request, limit_default=100)
        order_by = self.request.get('order_by')
        email_filter = self.request.get('email')
        users = []
        if email_filter:
            user = User.GetByEmail(email_filter)
            if user:
                users.append(user)
                success = True
            else:
                message = "User with email %s not found" % email_filter

        else:
            users = User.Fetch(self.enterprise, order_by=order_by, limit=max, offset=offset)
            success = True
        data = {
            'users': [user.json() for user in users]
            }
        self.json_out(data, success=success, message=message)


    @authorized.role('api')
    def detail(self, uid, d):
        message = None
        u = User.GetAccessible(int(uid), self.user)
        if u:
            success = True
        data = {
            'user': u.json() if u else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        success = False
        message = None
        id = self.request.get_range('id')
        params = tools.gets(self, strings=['name', 'password', 'phone', 'email', 'location_text', 'currency'],
            integers=['level', 'alert_channel'], lists=['group_ids'],
            json=['custom_attrs'], ignoreMissing=True)
        user = None
        isSelf = False
        if id:
            user = User.get_by_id(id)
            logging.debug(user)
        else:
            user = User.Create(d['enterprise'], email=params.get('email'), phone=params.get('phone'))
        if user:
            isSelf = user.is_saved() and user.key() == d['user'].key()
            user.Update(**params)
            user.put()
            success = True
        if user:
            if isSelf:
                self.session['user'] = user
                message = "Profile saved"
            else:
                message = "User saved"
        else:
            message = "Problem creating user"
        data = {
            'user': user.json() if user else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def delete(self, d):
        id = self.request.get_range('id')
        success = False
        if id:
            u = User.get_by_id(id)
            if u:
                u.clean_delete()
                success = True
        self.json_out(success=success)



class SensorMediaAPI(handlers.JsonRequestHandler):
    @authorized.role()
    def list(self, cid, id, d):
        success = False
        message = None
        p = None
        media = []
        if cid and id:
            p = Sensor.get_by_id(int(id), parent=db.Key.from_path('User', int(cid)))
            if p:
                media = p.getMedia()
                success = True
            else:
                message = "Sensor not found"
        else:
            message = "Malformed"

        data = {
            'media': [pm.json(imageSize=600) for pm in media]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        For creating video media
        """
        success = False
        message = None
        p = pm = None
        key = self.request.get('key')
        uid = self.request.get_range('uid')
        id = self.request.get_range('id')
        params = tools.gets(self, strings=['external_link'], integers=['type'])
        if id and uid:
            p = Sensor.get_by_id(id, parent=db.Key.from_path('User', uid))
            if p:
                pm = SensorMedia.Create(p, user=d['user'], _type=params.get('type'))
                if pm:
                    pm.Update(**params)
                    pm.put()
                    p.Update()
                    p.put()  # Change update timestamp
                    success = True
        else:
            message = "Malformed"
        data = {
            'media': pm.json() if pm else None
            }
        self.json_out(data, message=message, success=success)

    @authorized.role('api')
    def delete(self, d):
        success = False
        message = None
        pm = None
        key = self.request.get('key')
        if key:
            pm = SensorMedia.get(key)
            if pm:
                if pm.piece:
                    pm.piece.Update()
                    pm.piece.put()
                pm.clean_delete()
                success = True
        else:
            message = "Malformed"
        self.json_out(message=message, success=success)


class DataAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None
        records = []

        _max = self.request.get_range('max', max_value=500, default=100)
        sensor_kn = self.request.get('sensor_kn')
        dt_start = tools.dt_from_ts(self.request.get_range('ts_start'))
        dt_end = tools.dt_from_ts(self.request.get_range('ts_end'))
        downsample = self.request.get_range('downsample')

        if sensor_kn:
            s = Sensor.get_by_key_name(sensor_kn, parent=d['enterprise'])
            if s:
                records = Record.Fetch(s, dt_start=dt_start, dt_end=dt_end, downsample=downsample, limit=_max)
                success = True

        data = {
            'records': [r.json() for r in records]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, sensor_kn, ts, d):
        success = False
        message = None
        r = Record.Get(ts, self.enterprise, sensor_kn=sensor_kn)
        if r:
            success = True
        else:
            message = "Couldn't find record"
        self.json_out(success=success, message=message, data={'record': r.json(with_types=True) if r else None})


class SensorAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        key_names = self.request.get('key_names')  # comma sep
        page, _max, offset = tools.paging_params(self.request, limit_default=100)
        with_records = self.request.get_range('with_records', default=0)
        ms_updated_since = self.request.get_range('updated_since', default=0)  # ms
        target_id = self.request.get_range('target_id')
        order_by = self.request.get('order_by')
        group_id = self.request.get_range('group_id')

        updated_since = tools.dt_from_ts(ms_updated_since) if ms_updated_since else None

        if key_names:
            sensors = Sensor.get_by_key_name(key_names.split(','), parent=self.enterprise)
        else:
            sensors = Sensor.Fetch(d['user'], updated_since=updated_since, target_id=target_id, group_id=group_id, order_by=order_by, limit=_max, offset=offset)
        success = True

        data = {
            'sensors': [s.json(with_records=with_records) for s in sensors]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, kn, d):
        success = False
        message = None
        with_records = self.request.get_range('with_records', default=50)
        with_alarms = self.request.get_range('with_alarms', default=20)
        with_analyses = self.request.get_range('with_analyses', default=50)
        with_processers = self.request.get_range('with_processers') == 1
        with_sensortype = self.request.get_range('with_sensortype') == 1
        record_downsample = self.request.get_range('record_downsample')
        records_since = self.request.get_range('records_since', default=0) # 0 - no cutoff
        rule_id_filter = self.request.get_range('rule_id_filter')

        s = Sensor.get_by_key_name(kn, parent=d['enterprise'])
        if s:
            success = True
        else:
            message = "Sensor not found"
        data = {
            'sensor': s.json(
                with_records=with_records,
                records_since=records_since,
                with_alarms=with_alarms,
                with_processers=with_processers,
                with_analyses=with_analyses,
                record_downsample=record_downsample,
                rule_id_filter=rule_id_filter,
                with_sensortype=with_sensortype
            ) if s else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        """
        success = False
        message = None
        s = None
        key = self.request.get('key')
        kn = self.request.get('kn')
        params = tools.gets(self,
            strings=['name','lat','lon', 'sensortype_alias'],
            json=['contacts'],
            integers=['sensortype_id', 'target_id', 'process_task_id'],
            lists=['group_ids'])
        if key:
            s = Sensor.get(key)
        elif d['enterprise'] and kn and ('sensortype_id' in params or 'sensortype_alias' in params):
            # Create
            sensortype_id = params.get('sensortype_id')
            if not sensortype_id:
                alias = params.get('sensortype_alias')
                st = SensorType.Get(d['enterprise'], alias)
                if st:
                    sensortype_id = st.key().id()
            if sensortype_id:
                s = Sensor.Create(d['enterprise'], kn, sensortype_id)
            else:
                message = "No sensor type"
        else:
            message = "Malformed"
        if s:
            # Update
            s.Update(**params)
            s.put()
            s.updateSearchDoc()
            if 'process_task_id' in params:
                # Associate with processer
                pt = ProcessTask.GetAccessible(params['process_task_id'], d['user'], parent=d['enterprise'])
                if pt:
                    spt = SensorProcessTask.Create(d['enterprise'], pt, s, last_record_now=True)
                    if spt:
                        spt.put()
            success = True
        data = {
            'sensor': s.json() if s else None
            }
        self.json_out(data, message=message, success=success, debug=True)


    @authorized.role('api')
    def delete(self, d):
        success = False
        message = None
        s = None
        key = self.request.get('key')
        s = Sensor.get(key)
        if s:
            success = s.clean_delete()
            if not success:
                message = "Couldn't delete sensor"
        else:
            message = "Sensor not found"
        self.json_out({}, message=message, success=success)

    @authorized.role('api')
    def action(self, kn, action, d):
        success = False
        message = None
        s = None
        s = Sensor.get_by_key_name(kn, parent=d['enterprise'])
        if s:
            if action == "delete_all_alarms":
                rule_id = self.request.get_range('rule_id')
                if rule_id:
                    deleted = Alarm.Delete(sensor=s, rule_id=rule_id)
                    message = "Deleted %d alarm(s)" % (deleted)
                    success = True
                else:
                    message = "Malformed"
            elif action == "delete_all_records":
                records = Record.all(keys_only=True).filter("sensor =", s).fetch(3000)
                db.delete(records)
                message = "Deleted %d record(s)" % len(records)
                success = True
            else:
                raise Exception("Invalid action: %s" % action)
        else:
            message = "Sensor not found"
        self.json_out({}, message=message, success=success)


class SensorTypeAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        _max = self.request.get_range('max', max_value=500, default=100)

        types = d['enterprise'].sensortype_set.fetch(_max)

        data = {
            'sensortypes': [st.json() for st in types]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, id, d):
        st = SensorType.get_by_id(int(id), parent=self.enterprise)
        message = None
        if not st:
            message = "Sensor type %d not found" % id
        self.json_out({'sensortype': st.json() if st else None}, success=st is not None, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        """
        success = False
        message = None
        st = None
        key = self.request.get('key')
        params = tools.gets(self, strings=['name','alias'], json=['schema'])
        if key:
            st = SensorType.get(key)
        elif d['enterprise']:
            # Create
            st = SensorType.Create(d['enterprise'])
        else:
            message = "Malformed"
        if st:
            # Update
            schema_ok = True
            schema = params.get("schema")
            if schema:
                for colname in RECORD.ILLEGAL_COLNAMES:
                    if colname in schema:
                        schema_ok = False
                        break
            if schema_ok:
                st.Update(**params)
                st.put()
                success = True
            else:
                message = "Illegal column name in schema"
        data = {
            'sensortype': st.json() if st else None
            }
        self.json_out(data, message=message, success=success)

    @authorized.role('api')
    def delete(self, d):
        success = False
        message = None
        s = None
        key = self.request.get('key')
        s = SensorType.get(key)
        if s:
            success = s.clean_delete()
            if not success:
                message = "Couldn't delete sensor"
        else:
            message = "Alarm type not found"
        self.json_out({}, message=message, success=success)

class GroupAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = True
        message = None

        _max = self.request.get_range('max', max_value=500, default=100)

        if self.user.is_admin():
            sgs = d['enterprise'].sensorgroup_set.fetch(_max)
        else:
            sgs = self.user.get_groups()

        data = {
            'groups': [sg.json() for sg in sgs]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, id, d):
        g = SensorGroup.GetAccessible(long(id), d['user'], parent=self.enterprise)
        success = False
        message = None
        if g:
            success = True
        self.json_out({'group': g.json() if g else None}, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        """
        success = False
        message = None
        sg = None
        key = self.request.get('key')
        params = tools.gets(self, strings=['name'])
        if key:
            sg = SensorGroup.get(key)
        elif d['enterprise']:
            # Create
            if params.get('name'):
                sg = SensorGroup.Create(d['enterprise'])
            else:
                message = "Name required"
        else:
            message = "Malformed"
        if sg:
            # Update
            sg.Update(**params)
            sg.put()
            sg.updateSearchDoc()
            success = True
        data = {
            'group': sg.json() if sg else None
            }
        self.json_out(data, message=message, success=success, debug=True)

    @authorized.role('api')
    def delete(self, d):
        success = False
        message = None
        grp = id = None
        key = self.request.get('key')
        grp = SensorGroup.get(key)
        if grp:
            success = grp.clean_delete()
            id = grp.key().id()
            if not success:
                message = "Couldn't delete group - not empty?"
        else:
            message = "Group not found"
        self.json_out({"key": key, "id": id}, message=message, success=success)

class TargetAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        """Fetch a list of targets

        Args:
            max: page size (1-500, default 100)
            updated_since: (optional) timestamp (ms) of update cutoff

        Returns:
            JSON: 'targets' list of target objects
        """
        success = False
        message = None

        page, _max, offset = tools.paging_params(self.request, limit_default=100)
        ms_updated_since = self.request.get_range('updated_since', default=0)  # ms
        group_id = self.request.get_range("group_id")

        updated_since = tools.dt_from_ts(ms_updated_since) if ms_updated_since else None
        targets = Target.Fetch(d['user'], updated_since=updated_since, group_id=group_id, limit=_max, offset=offset)
        success = True

        data = {
            'targets': [tgt.json() for tgt in targets]
            }
        self.json_out(data, success=success, message=message)


    @authorized.role('api')
    def detail(self, id, d):
        t = Target.GetAccessible(long(id), d['user'], parent=self.enterprise)
        success = False
        message = None
        if t:
            success = True
        self.json_out({'target': t.json() if t else None}, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        """
        success = False
        message = None
        target = None
        key = self.request.get('key')
        params = tools.gets(self, strings=['name','lat','lon'], lists=['group_ids'])
        if key:
            target = Target.get(key)
        elif d['enterprise']:
            if params.get('name'):
                # Create
                target = Target.Create(d['enterprise'])
            else:
                message = "Name required"
        else:
            message = "Malformed"
        if target:
            # Update
            target.Update(**params)
            target.put()
            target.updateSearchDoc()
            success = True
        data = {
            'target': target.json() if target else None
            }
        self.json_out(data, message=message, success=success)

    @authorized.role('api')
    def delete(self, d):
        success = False
        message = id = None
        key = self.request.get('key')
        target = Target.get(key)
        if target:
            success, message = target.clean_delete()
            if success:
                id = target.key().id()
        else:
            message = "Target not found"
        self.json_out({"key": key, "id": id}, message=message, success=success)


class AlarmAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        page, _max, offset = tools.paging_params(self.request, limit_default=50)
        sensor_kn = self.request.get('sensor_kn')
        with_props = self.request.get('with_props', default_value="").split(',')
        rule_id = self.request.get_range('rule_id')
        dt_start = tools.dt_from_ts(self.request.get_range('ts_start'))
        dt_end = tools.dt_from_ts(self.request.get_range('ts_end'))
        rule = None
        sensor = False
        if sensor_kn:
            sensor = Sensor.get_by_key_name(sensor_kn, parent=self.enterprise.key())
        if rule_id:
            rule = db.Key.from_path('Rule', rule_id, parent=self.enterprise.key())
        alarms = Alarm.Fetch(enterprise=d['enterprise'],
                             sensor=sensor, rule=rule,
                             limit=_max, offset=offset,
                             dt_start=dt_start, dt_end=dt_end)
        if 'sensor_name' in with_props:
            tools.prefetch_reference_properties(alarms, 'sensor')
        success = True

        data = {
            'alarms': [a.json(with_props=with_props) for a in alarms]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, skn, aid, d):
        success = False
        message = None
        skey = db.Key.from_path('Sensor', skn, parent=d['enterprise'].key())
        akey = db.Key.from_path('Alarm', int(aid), parent=skey)
        buffer_ms = self.request.get_range('buffer_ms')
        with_records = self.request.get_range('with_records') == 1
        data = {}
        if akey:
            a = Alarm.get(akey)
            if a:
                data['alarm'] = a.json()
                if with_records:
                    range_buffer = timedelta(seconds=buffer_ms/1000)
                    data['records'] = [r.json() for r in Record.Fetch(skey, dt_start=a.dt_start - range_buffer, dt_end=a.dt_end + range_buffer)]
                success = True
            else:
                message = "Alarm not found"

        self.json_out(data, success=success, message=message)

class AnalysisAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        with_props = self.request.get_range('with_props') == 1
        _max = self.request.get_range('max', max_value=500, default=50)
        sensortype_id = self.request.get_range('sensortype_id')
        sensor_kn = self.request.get('sensor_kn')

        sensor = None
        if sensor_kn:
            sensor = Sensor.get_by_key_name(sensor_kn, parent=self.enterprise)
        analyses = Analysis.Fetch(d['enterprise'], sensortype_id=sensortype_id, sensor=sensor, limit=_max)
        success = True

        data = {
            'analyses': [a.json(with_props=with_props) for a in analyses]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, akn, d):
        success = False
        message = None

        akey = db.Key.from_path('Analysis', akn, parent=d['enterprise'].key())

        with_props = self.request.get_range('with_props') == 1

        a = Analysis.get(akey)
        if a:
            success = True

        data = {
            'analysis': a.json(with_props=with_props) if a else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail_multi(self, akn_list, d):
        success = False
        message = None

        _akn_list = akn_list.split(',')
        akeys = [db.Key.from_path('Analysis', akn, parent=d['enterprise'].key()) for akn in _akn_list]

        with_props = self.request.get_range('with_props') == 1

        data = {'analyses': {}}
        analyses = Analysis.get(akeys)
        if analyses:
            success = True
            for a in analyses:
                if a:
                    data['analyses'][a.key().name()] = a.json(with_props=with_props)

        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        success = False
        message = None

        cols = self.request.get('cols').split(',')
        akn = self.request.get('akn')

        akey = db.Key.from_path('Analysis', akn, parent=d['enterprise'].key())

        a = Analysis.Get(self.enterprise, akn, get_or_insert=True)
        if a:
            for col in cols:
                val = self.request.get(col)
                a.setColumnValue(col, val)
            a.put()
            success = True

        data = {
            'analysis': a.json(with_props=True) if a else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update_multi(self, d):
        success = False
        message = None

        data_dict = tools.getJson(self.request.get('data'))  # Analysis key -> Dict of cols -> values

        kns = data_dict.keys()
        akeys = [db.Key.from_path('Analysis', akn, parent=d['enterprise'].key()) for akn in kns]
        analyses = Analysis.get(akeys)
        db_put = []
        for akn, a in zip(kns, analyses):
            if not a:
                a = Analysis.Get(self.enterprise, akn, get_or_insert=True)
            data = data_dict.get(a.key().name())
            for col, val in data.items():
                a.setColumnValue(col, val)
            db_put.append(a)
        db.put(db_put)
        message = "Updating %d objects" % len(db_put)
        success = bool(len(db_put))
        self.json_out(success=success, message=message)


class RuleAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        _max = self.request.get_range('max', max_value=500, default=100)

        rules = Rule.Fetch(d['enterprise'], limit=_max)
        success = True

        data = {
            'rules': [s.json() for s in rules]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role()
    def detail(self, skey, d):
        success = False
        message = None
        rule = Rule.get(skey)
        if rule:
            success = True
        else:
            message = "Alarm type not found"
        data = {
            'rule': rule.json() if rule else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        """
        success = False
        message = None
        rule = None
        key = self.request.get('key')
        params = tools.gets(self,
            strings=['name','column','alert_message','payment_amount'],
            floats=['value1','value2'],
            json=['value_complex', 'spec'],
            integers=['sensortype_id','duration','buffer','plimit','plimit_type','consecutive','consecutive_limit','trigger'],
            lists=['alert_contacts','payment_contacts'])
        if key:
            rule = Rule.get(key)
        elif d['enterprise']:
            # Create
            rule = Rule.Create(d['enterprise'])
        else:
            message = "Malformed"
        if rule:
            # Update
            update_message = rule.Update(**params)
            if update_message:
                message = update_message
            rule.put()
            success = True
        data = {
            'rule': rule.json() if rule else None
            }
        self.json_out(data, message=message, success=success, debug=True)


    @authorized.role('api')
    def delete(self, d):
        success = False
        message = None
        key = self.request.get('key')
        rule = Rule.get(key)
        if rule:
            success = rule.clean_delete()
            if not success:
                message = "Couldn't delete rule"
        else:
            message = "Rule not found"
        self.json_out({}, message=message, success=success)

class SensorProcessTaskAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        running = self.request.get_range('running') == 1

        _max = self.request.get_range('max', max_value=500, default=20)

        spts = SensorProcessTask.Fetch(enterprise=d['enterprise'], only_running=running, limit=_max, refresh=True)
        success = True

        data = {
            'sensorprocesstasks': [spt.json() for spt in spts]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, kn, d):
        success = False
        message = None
        if kn:
            spt = SensorProcessTask.get_by_key_name(kn, parent=self.enterprise.key())
            success = spt is not None
        self.json_out({
            'spt': spt.json() if spt else None
        }, message=message, success=success)

    @authorized.role('api')
    def delete(self, d):
        key = self.request.get('key')
        message = None
        success = False
        if key:
            spt = SensorProcessTask.get(key)
            if spt:
                success = spt.clean_delete()
                if success:
                    message = "Task deleted"
        self.json_out({}, message=message, success=success)

    @authorized.role('api')
    def clean_up(self, d):
        '''Clear running flag on stalled run
        '''
        success = False
        message = None
        sptkey = self.request.get('sptkey')
        ignore_unprocessed = self.request.get_range('ignore_unprocessed')
        spt = SensorProcessTask.get(sptkey)
        if spt:
            if spt.is_running() or ignore_unprocessed:
                spt.clean_up(ignore_unprocessed=ignore_unprocessed)
                spt.put()
                success = True
            else:
                message = "Not running..."
        else:
            message = "Task not found"
        self.json_out({}, success=success, message=message)

class ProcessTaskAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        _max = self.request.get_range('max', max_value=500, default=100)

        processes = ProcessTask.Fetch(d['enterprise'], limit=_max)
        success = True

        data = {
            'processtasks': [s.json() for s in processes]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def detail(self, key_or_id, d):
        success = False
        message = None
        if key_or_id.isdigit():
            p = ProcessTask.get_by_id(int(key_or_id), parent=self.enterprise)
        else:
            p = ProcessTask.get(key_or_id)
        if p:
            success = True
        else:
            message = "ProcessTask not found"
        data = {
            'processtask': p.json() if p else None
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def update(self, d):
        """
        Update or Create
        """
        success = False
        message = None
        p = None
        key = self.request.get('key')
        params = tools.gets(self, strings=['label'], times=['time_start','time_end'], integers=['interval'], json=['spec'], lists=['rule_ids','month_days','week_days'])
        if key:
            p = ProcessTask.get(key)
        elif d['enterprise']:
            # Create
            p = ProcessTask.Create(d['enterprise'])
        else:
            message = "Malformed"
        if p:
            # Update
            p.Update(**params)
            p.put()
            success = True
            message = "Process task updated!"
        data = {
            'processtask': p.json() if p else None
            }
        self.json_out(data, message=message, success=success, debug=True)


    @authorized.role('api')
    def delete(self, d):
        success = False
        message = "Not implemented"
        key = self.request.get('key')
        self.json_out({}, message=message, success=success)

    @authorized.role('api')
    def duplicate(self, d):
        success = False
        message = None
        key = self.request.get('key')
        pt = ProcessTask.get(key)
        if pt:
            new_pt = pt.duplicate()
            if new_pt:
                new_pt.put()
                success = True
                message = "%s duplicated" % pt
        self.json_out({'processtask': new_pt.json() if new_pt else None}, success=success)


    @authorized.role('api')
    def associate(self, d):
        success = False
        message = None
        key = self.request.get('key')
        skey = self.request.get('skey')  # Sensor key
        pt = ProcessTask.get(key)
        s = Sensor.get(skey)
        if pt and s:
            spt = SensorProcessTask.Create(d['enterprise'], pt, s, last_record_now=True)
            if spt:
                spt.put()
                SensorProcessTask.Fetch(sensor=s)
                success = True
        self.json_out({'spt': spt.json() if spt else None}, success=success)

    @authorized.role('api')
    def run(self, d):
        success = False
        message = None
        # TODO: Should this be in SensorProcessTaskAPI?
        sptkey = self.request.get('sptkey')  # Key of SensorProcessTask()
        spt = SensorProcessTask.get(sptkey)
        if spt:
            success = spt.run()
            if not success:
                message = "Can't run this task -- already running or no records to process?"
            else:
                message = "Running..."
        else:
            message = "Task not found"
        self.json_out({}, success=success, message=message)



def backgroundReportRun(rkey, target=None, start_cursor=None):
    r = Report.get(rkey)
    if r:
        r.run(target, start_cursor=start_cursor)

class ReportAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        _max = self.request.get_range('max', max_value=500, default=100)

        reports = Report.Fetch(d['enterprise'], limit=_max)
        success = True

        data = {
            'reports': [r.json() for r in reports]
            }
        self.json_out(data, success=success, message=message)


    @authorized.role('api')
    def generate(self, d):
        from handlers import APIError
        type = self.request.get_range('type')
        if not type:
            raise APIError("No type in report request")
        ftype = self.request.get_range('ftype', default=REPORT.CSV)
        target = self.request.get('target')
        specs_json = self.request.get('specs_json')
        specs = tools.getJson(specs_json)
        report = Report.Create(d['enterprise'], type=type, specs=specs, ftype=ftype)
        report.put()
        tools.safe_add_task(backgroundReportRun, str(report.key()), target=target, _queue="report-queue")
        self.json_out(success=True, message="%s generating..." % report.title, data={
            'report': report.json() if report else None
            })

    @authorized.role('api')
    def serve(self, d):
        rkey = self.request.get('rkey')
        r = Report.GetAccessible(rkey, d['user'])
        if r:
            if r.isDone() and r.gcs_files:
                gcsfn = r.gcs_files[0]
                if tools.on_dev_server():
                    try:
                        gcs_file = gcs.open(gcsfn, 'r')
                    except gcs.NotFoundError, e:
                        self.response.out.write("File not found")
                    else:
                        self.response.headers['Content-Type'] = Report.contentType(r.extension)
                        self.response.headers['Content-Disposition'] = str('attachment; filename="%s"' % r.filename())
                        self.response.write(gcs_file.read())
                        gcs_file.close()
                else:
                    # if not localhost, pick the file from GCS directly with a
                    # public link that expires after [5] seconds.
                    # Thus, serve very large files without using instance hours
                    signed_url = tools.sign_gcs_url(gcsfn, expires_after_seconds=5)
                    response = self.redirect(signed_url)
                    logging.info(response)
            else:
                self.json_out(success=False, status=404, message="Report not ready") # Not found
        else:
            self.response.out.write("Unauthorized")

    @authorized.role('api')
    def delete(self, d):
        success = False
        rkey = self.request.get('rkey')
        r = Report.GetAccessible(rkey, d['user'])
        if r:
            r.CleanDelete(self_delete=True)
            message = "Report deleted"
            success = True
        else:
            message = "Report not found"
        self.json_out(success=success, message=message)


class APILogAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        _max = self.request.get_range('max', max_value=500, default=100)

        apilogs = APILog.Recent(self.enterprise, _max=_max)
        success = True

        data = {
            'logs': [r.json() for r in apilogs]
            }
        self.json_out(data, success=success, message=message)


class PaymentAPI(handlers.JsonRequestHandler):
    @authorized.role('api')
    def list(self, d):
        success = False
        message = None

        with_user = self.request.get_range('with_user') == 1
        _max = self.request.get_range('max', max_value=500, default=100)

        pmnts = Payment.Fetch(ent=self.enterprise, limit=_max)
        success = True

        data = {
            'payments': [pmnt.json(with_user=with_user) for pmnt in pmnts]
            }
        self.json_out(data, success=success, message=message)

    @authorized.role('api')
    def send(self, d):
        """
        Request, resend, or spoof payment
        """
        spoof = self.request.get_range('spoof') == 1
        pkey = self.request.get('pkey')
        success = False
        message = None
        user = None
        pmnt = None
        params = tools.gets(self, integers=['user_id', 'amount'])
        if pkey:
            # Resend existing
            pmnt = Payment.get(pkey)
            success = pmnt.send()
            message = "Payment resend requested" if success else "Failed to re-send payment"
        else:
            # Request or spoof?
            if 'user_id' in params:
                user = User.get_by_id(long(params['user_id']))
            if user:
                pmnt = Payment.Request(self.enterprise, user, params.get('amount', 0), send=False)
                if pmnt:
                    success = True
                    message = "Spoof payment requested"
            else:
                message = "User not found"
        data = {
            'payment': pmnt.json() if pmnt else None
            }
        self.json_out(data, message=message, success=success, debug=True)


def SaveUploadsToEntity(entity, uploads, put=False):
    # TODO: Move to GCS?
    success = False
    message = None
    if len(uploads):
        if entity:
            if entity.kind() == 'Sensor':
                pass
            elif entity.kind() == 'SomethingElse':
                pass
            blob_info = uploads[0]
            bk = str(blob_info.key())
            entity.data_key = bk
            if put:
                entity.put()
            success = True
            message = "OK"
        else:
            message = "Malformed - No entity"
    else:
        message = "Malformed - no uploads"
    return [success, message]

class UploadMedia(handlers.BaseUploadHandler):
    def post(self):
        try:
            piece_id = self.request.get_range('piece_id')
            _type = self.request.get_range('type', default=MEDIA.PHOTO)
            file_infos = self.get_file_infos()
            user = self.session.get('user')
            dbp = []
            urls = []
            if piece_id and user:
                p = Sensor.get_by_id(piece_id, parent=user)
                if p:
                    if len(file_infos):
                        for fi in file_infos:
                            logging.debug(fi)
                            if fi and fi.gs_object_name:
                                pm = SensorMedia.Create(p, user, _type=_type)
                                if pm:
                                    pm.Update(data_key=fi.gs_object_name, size=fi.size, content_type=fi.content_type, description=fi.filename, md5=fi.md5_hash)
                                    dbp.append(pm)
                            else: raise Exception("Malformed 2")
                    else: raise Exception("No file data found")
                else: raise Exception("Sensor not found with ID %s. User: %s" % (piece_id, user))
                if dbp:
                    db.put(dbp)
                    urls = [x.servingUrl() for x in dbp]
            else: raise Exception("Malformed")
        except Exception, e:
            logging.error(e)
            self.response.out.write("Error: %s" % e)
            self.response.set_status(500)
        else:
            if dbp:
                self.response.out.write(json.dumps({'media': [p.json() for p in dbp]}))
            else:
                self.response.out.write("OK")

class UploadProfilePhoto(handlers.BaseUploadHandler):
    def post(self):
        try:
            file_infos = self.get_file_infos()
            user = self.session.get('user')
            urls = []
            if user:
                if len(file_infos):
                    fi = file_infos[0]
                    if fi and fi.gs_object_name:
                        user.Update(av_data_key=fi.gs_object_name, av_content_type=fi.content_type)
                        user.put()
                        logging.debug("Setting user in session: %s" % user.avatar_serving_url())
                        self.session['user'] = user
                    else: raise Exception("Malformed")
                else: raise Exception("No file data found")
            else: raise Exception("Malformed")
        except Exception, e:
            logging.error(e)
            self.response.out.write("Error: %s" % e)
            self.response.set_status(500)
        else:
            if user:
                self.json_out({'url': user.avatar_serving_url()})


class Logout(handlers.JsonRequestHandler):
    def post(self):
        if self.session.has_key('user'):
            for key in self.session.keys():
                del self.session[key]
        self.json_out({'success': True})

class Login(handlers.BaseRequestHandler):
    @authorized.role()
    def post(self, d):
        user = None
        message = email = None
        auth = self.request.get('auth')
        pw = self.request.get('_pw')
        _login = self.request.get('_login')
        token = self.request.get('_token') # Google ID Token
        name = self.request.get('name')
        custom_attrs = self.request.get('custom_attrs')
        if custom_attrs:
            custom_attrs = custom_attrs.split(',')
        else:
            custom_attrs = None
        error_code = 0
        ok = False
        user = User.FuzzyGet(_login)
        if user:
            ok = False
            if (pw and user.validatePassword(pw)):
                ok = True
            elif token:
                ok = services.VerifyGoogleJWT(token, email=email)
                if ok:
                    user.session_id_token = str(token)
                    logging.debug("User token is now: %s" % user.session_id_token)
                else:
                    logging.debug("JWT invalid")
                    # Assume Google certs expired and retry
                    services.UpdateGoogleKeyCerts()
                    error_code = 2 # Bad token
            if ok:
                message = "Successful Login"
                self.session['user'] = user
                self.session['enterprise'] = user.enterprise
            else:
                user = None
                error_code = 1 # Unauthorized
                message = "Login / password mismatch"
        elif token:
            # No user, but this is an authenticated G+ login, so let's create the account
            ok = services.VerifyGoogleJWT(token, email=email)
            if ok:
                user = User.Create(email=email, name=name)
                if user:
                    user.session_id_token = str(token)
                    user.put()
        else:
            message = "User not found"
            error_code = 3

        data = {
            'ts': tools.unixtime(),
            'user': user.json(custom_attrs=custom_attrs) if user else None,
            'password': pw
        }
        self.json_out(data, message=message, error=error_code)

class GetUploadUrl(handlers.JsonRequestHandler):
    @authorized.role('api')
    def get(self, d):
        target = self.request.get('target')
        gcs_bucket = self.request.get('gcs_bucket')
        success = False
        url = None
        message = None
        if target:
            if gcs_bucket:
                gcs_bucket = "%s/%s" % (GCS_MEDIA_BUCKET, gcs_bucket)
                url = blobstore.create_upload_url(target, gs_bucket_name=gcs_bucket[1:])
            else:
                url = blobstore.create_upload_url(target)
            message = "OK"
            success = True
        else:
            message = "Please include target paramater"
        self.json_out({
            'url': url,
            'message': message
            }, success=success)


class SendEmail(handlers.JsonRequestHandler):
    @authorized.role('api')
    def post(self, d):
        success = False
        to = self.request.get('to')
        subject = self.request.get('subject')
        message = self.request.get('message')
        success = tools.is_valid_email(to) and subject and message
        if success:
            subject = EMAIL_PREFIX + subject
            logging.debug("To: %s, Subject: %s" % (to, subject))
            body = "Message from %s\n---------------\n\n" % d['user']
            body += message
            deferred.defer(mail.send_mail, sender=SENDER_EMAIL, to=to, subject=subject, body=body)
        self.json_out({}, success=success)

    @authorized.role('api')
    def get(self):
        self.post()


class SearchAPI(handlers.JsonRequestHandler):

    @authorized.role('user')
    def delete_doc(self, doc_key, d):
        index = d['enterprise'].get_search_index()
        if index:
            index.delete(doc_key)
            self.response.out.write("OK")

    @authorized.role('api')
    def search(self, d):
        RESULT_LIMIT = 20
        term = self.request.get('term')
        results = []
        success = False
        message = None
        index = d['enterprise'].get_search_index()
        try:
            query_options = search.QueryOptions(limit=RESULT_LIMIT)
            query = search.Query(query_string=term, options=query_options)
            search_results = index.search(query)
        except Exception, e:
            logging.error("Error in search api: %s" % e)
        else:
            success = True
            for sd in search_results.results:
                fields = sd.fields
                name = type = None
                for f in fields:
                    if f.name == UserAccessible.FTS_DOC_NAME:
                        name = f.value
                if name:
                    type, doc_id = sd.doc_id.split(':')
                    results.append({'type': type, 'id': doc_id, 'label': name})

        self.json_out({"results": results}, success=success, message=message)


class PaymentCallback(handlers.JsonRequestHandler):
    """
    handles callbacks about incentives
    """

    def post(self, service):
        """
        handles the post requests to this service
        """
        logging.debug("Payment callback (%s) params: %s" % (
            service,
            [(arg, self.request.get(arg)) for arg in self.request.arguments()])
        )
        self.service = service
        if self.service in SUPPORTED_PAYMENT_GATEWAYS:
            result = self.handle_callback()
            self.response.out.write(result)
        else:
            self.json_out(success=False, status=400)

    def handle_callback(self):
        """
        handles the callback logic
        """
        from models import Payment
        request_id = self.request.get('requestId')
        status = self.request.get('status')
        pmnt = Payment.Get(request_id)
        if pmnt:
            if status == 'Success':
                pmnt.confirmed()
            else:
                # Failed
                pmnt.failed()
                if PAYMENT_RETRIES_ENABLED and pmnt.attempts < PAYMENT_RETRIES_ENABLED:
                    # Schedule after delay?
                    self.send()
            pmnt.put()
        else:
            cdr = "%s not found" % (request_id)
            logging.debug(cdr)
        return "Callback Accepted"
