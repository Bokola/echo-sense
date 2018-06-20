import django_version
import logging

from google.appengine.ext import webapp, db

from models import *
from constants import *
import json
import services
import authorized
import outbox
import handlers
import tools
from google.appengine.api import memcache
import datetime

class Install(handlers.BaseRequestHandler):
    '''Initialize / Install Echo Sense with first account / user

    Params:
        enterprise_name (string): Enterprise name
        email (string): If creating user
        password (string): If creating user
        phone (string): If creating user
        pw (string): install pw defined in constants.py
    '''
    def post(self):
        e = None
        pw = self.request.get('pw')
        email = self.request.get('email')
        password = self.request.get('password')
        phone = self.request.get('phone')
        issue = ""
        logging.debug("Installing...")
        if pw == INSTALL_PW:

            empty_db = Enterprise.all().get() is None

            if empty_db:

                if email and password:
                    e = Enterprise.Create()
                    enterprise_name = self.request.get("enterprise_name", default_value="Test Enterprise")
                    e.Update(name=enterprise_name)
                    e.put()

                    if e:
                        u = User.Create(e, email=email)
                        u.Update(password=password, level=USER.ADMIN, phone=phone)
                        u.put()
                else:
                    issue = "Email or password missing"

            else:
                issue = "Already installed"
        else:
            issue = "Invalid installation password"
        self.redirect_to("adminInstall", issue=issue)

    def get(self):
        issue = self.request.get('issue')
        d = {
            'installed': Enterprise.all().get() is not None,
            'issue': issue
        }
        self.render_template("install.html", **d)

# class ManualDSRestore(handlers.JsonRequestHandler):
#     def post(self):
#         model_type = self.request.get('model')
#         payload = json.loads(self.request.get('payload'))
#         class_instance = self.get_model(model_type)
#         entities = []
#         for record in payload:
#             entity = self.create_entity(class_instance, record)
#             entities.append(entity)
#         db.put(entities)
#         self.json_out({'success': True, 'message': 'check logs'})

#     def get_enterprise(self):
#         ents = Enterprise.all()
#         for each in ents:
#             if 'UCB' in each.name:
#                 return each

#     def create_entity(self, model, record):
#         # refs = filter(lambda x: isinstance(x, db.ReferenceProperty)), record.keys()
#         for each in record.keys():
#             if not record[each]:
#                 del record[each]
#                 continue
#             value = record[each]
#             try:
#                 prop = getattr(model, each)
#             except Exception, err:
#                 logging.warning("%s not present" % each)
#                 logging.warning(err)
#             if isinstance(prop, db.IntegerProperty):
#                 value = int(value)
#             elif isinstance(prop, db.DateTimeProperty):
#                 try:
#                     value = datetime.datetime.fromtimestamp(int(value))
#                 except:
#                     del record[each]
#                     continue
#             elif isinstance(prop, db.FloatProperty):
#                 try:
#                     value = float(value) if value else None
#                 except Exception, err:
#                     logging.error(record)
#                     raise err
#             elif isinstance(prop, db.TimeProperty):
#                 del record[each]
#                 continue

#             if (each == 'time_start') or (each == 'time_end'):
#                 del record[each]
#                 continue
#             record[each] = value
#         if 'enterprise' in record:
#             record['enterprise'] = self.get_enterprise()
#         record['parent'] = self.get_enterprise()
#         entity = model(**record)
#         return entity


#     def get_model(self, _model):
#         """
#         """
#         sttmnt = 'models.'
#         class_instance = self.dynamic_import(sttmnt, _model)
#         if not class_instance:
#             raise ImportError("%s model is unknown" % _model)
#         return class_instance

#     def dynamic_import(self, module, attribute):
#         try:
#             handler = __import__(module, fromlist=['*'])
#             if hasattr(handler, attribute):
#                 return getattr(handler, attribute)
#         except Exception, err:
#             error = 'dynamic_import error:%s' % str(err)
#             logging.error(error)

# class DeleteRecord(handlers.JsonRequestHandler):

#     def get(self):
#         tools.safe_add_task(start_deletion)
#         self.response.out.write("Running deletion")

# def delete_records(tasks):
#     first = tasks[0]
#     last = tasks[-1]
#     logging.info('deleting from %s to %s' % (first, last))
#     db.delete_async(tasks)

# def start_deletion():
#     query = Record.all(keys_only=True)
#     cursor = memcache.get('cursor')
#     max_tasks = range(200)
#     for task in max_tasks:
#         if cursor:
#             query.with_cursor(start_cursor=cursor)
#         tasks = query.fetch(limit=1000)
#         memcache.set('cursor', query.cursor())
#         if tasks:
#             logging.info("deleting %s tasks" % len(tasks))
#             tools.safe_add_task(delete_records, tasks, _queue="processing-queue-new")


class CleanDelete(handlers.BaseRequestHandler):
    """Completely removes a single entity with given key by calling their clean_wipe method, if present"""
    @authorized.role("admin")
    def get(self, key, d):
        origin = str(self.request.get('origin', default_value="/admin"))
        if key:
            entity = db.get(key)
            if entity:
                try:
                    entity._clean_delete()
                except:
                    logging.debug("Failed to clean delete entity key(%s) kind(%s).  Perhaps method clean_wipe isn't defined?  Or perhaps we timed out." % (key, entity.kind()))
        self.redirect(origin)

class SimpleDeleteEntity(handlers.BaseRequestHandler):
    @authorized.role("admin")
    def get(self, key, d):
        origin = self.request.get('origin')
        if not origin:
            origin = "/admin"
        entity = db.get(key)
        if entity:
            entity.delete()
        self.redirect(origin)

class UpdateGoogleKeyCerts(handlers.BaseRequestHandler):
    @authorized.role()
    def get(self, d):
        cert = services.UpdateGoogleKeyCerts()
        self.json_out(cert)

class ManualGCM(handlers.JsonRequestHandler):
    """
    """
    @authorized.role('admin')
    def post(self, d):
        success = False
        api_message = None
        message = self.request.get('message')
        if message:
            data = json.loads(message)
        else:
            data = None
        user_ids_raw = self.request.get('user_ids')
        if user_ids_raw:
            users = User.get_by_id([int(_id.strip()) for _id in user_ids_raw.split(',') if _id])
        else:
            users = []
        if len(users) and data:
            outbox.send_gcm_message(payload=data, users=users)
            success = True
            api_message = "Sending message..."
        else:
            api_message = "No users..."
        self.json_out({
            'success': success,
            'message': api_message
        })

class CreateUser(handlers.BaseRequestHandler):
    @authorized.role("admin")
    def get(self, key, d):
        pass

class LogoutUser(handlers.BaseRequestHandler):
    @authorized.role("admin")
    def get(self, ukey, d):
        u = User.get(ukey)
        if u:
            u.session_id_token = None
            u.put()
        self.redirect_to("vAdminUsers")
