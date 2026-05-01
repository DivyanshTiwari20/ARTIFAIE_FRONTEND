import sys

file_path = r'd:\work\ARTIFAIE_FRONTEND\services\api.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''export const getNotifications = async (
  mode?: 'task' | 'general',
  options: GetRequestOptions = {}
) => {
  const params = new URLSearchParams();
  if (mode) params.append('mode', mode);
  const qs = params.toString();'''

replacement1 = '''export const getNotifications = async (
  mode?: 'task' | 'general',
  dateFilter?: string,
  options: GetRequestOptions = {}
) => {
  const params = new URLSearchParams();
  if (mode) params.append('mode', mode);
  if (dateFilter) params.append('dateFilter', dateFilter);
  const qs = params.toString();'''

target2 = target1.replace('\n', '\r\n')
replacement2 = replacement1.replace('\n', '\r\n')

if target1 in content:
    content = content.replace(target1, replacement1)
    print('Replaced LF')
elif target2 in content:
    content = content.replace(target2, replacement2)
    print('Replaced CRLF')
else:
    print('Target not found')

target3 = '''    getTasks({}, requestOptions),
    getNotifications(undefined, requestOptions),'''
replacement3 = '''    getTasks({}, requestOptions),
    getNotifications(undefined, 'today', requestOptions),'''

if target3 in content:
    content = content.replace(target3, replacement3)
elif target3.replace('\n', '\r\n') in content:
    content = content.replace(target3.replace('\n', '\r\n'), replacement3.replace('\n', '\r\n'))

with open(file_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
