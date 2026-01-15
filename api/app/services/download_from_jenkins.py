import requests
import os
import zipfile
import pandas as pd
import warnings
import shutil
import tarfile
warnings.simplefilter(action='ignore', category=FutureWarning)

RESULT_KEY = "od_perception_check"
PERCEPTION_KEY = "od_perception"
DEPLOY_KEY = "od_deploy"


def request_url(url):
    try:
        response = requests.get(url, auth=('qi_zhang', '123'))
        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as e:
        # print(f"get url {url} failed: {e}")
        return None


def get_scene_name_from_url(url):
    key_str = "-m src.perception.od_perception"
    split_str = "--inno_pc_path="
    con_url = url.strip() + 'consoleFull'
    response = request_url(con_url)
    if response is None:
        return None
    for i in response.text.split('\n'):
        if key_str in i:
            items = i.replace(key_str, '').split(split_str)[-1]
            items = items.strip().split(' ')[0].strip()
            return items
    key_str = "INNO_PC_PATH="
    for i in response.text.split('\n'):
        if key_str in i:
            items = i.replace(key_str, '').split('/')[-1].strip()
            return items
    return None


def formater_name(name):
    if name is not None:
        if name.startswith('ARM') or name.startswith('arm'):
            name = name[3:]
        name = name.lstrip('_').lstrip('-').lstrip(' ')
    return name


def extract_od_perception_check_urls(url):
    try:
        response = request_url(url)
        if response is None:
            return [], [], None, f"get {url} consoleFull failed"
        od_tag = get_od_tag(url)

        urls_perception = []   # (url, base_name)
        urls_check = []   # (url, base_name)
        for i in response.text.split('\n'):
            if RESULT_KEY not in i:
                continue

            c = i.split('</div></div>')
            for j in c:
                if RESULT_KEY not in j:
                    continue
                if f'{DEPLOY_KEY}: :&nbsp;' in j:
                    all_scene = j.split(f'{DEPLOY_KEY}: :&nbsp;')
                elif f'{DEPLOY_KEY}_arm: :&nbsp;' in j:
                    all_scene = j.split(f'{DEPLOY_KEY}_arm: :&nbsp;')
                elif f'{DEPLOY_KEY}_x86: :&nbsp;' in j:
                    all_scene = j.split(f'{DEPLOY_KEY}_x86: :&nbsp;')
                else:
                    continue
                for scene in all_scene[1:]:
                    items = scene.split('<br>')
                    item_url = None
                    for item in items:
                        if item.strip() and RESULT_KEY in item:
                            item_url = item.strip().replace(
                                f'{RESULT_KEY}: :&nbsp; ', '')
                            item_name = get_data_name_from_url(item_url)
                            item_name = formater_name(item_name)
                            urls_check.append((item_url, item_name))
                        elif item.strip():
                            tmp_key = PERCEPTION_KEY
                            if tmp_key in item:
                                pass
                            elif f'{PERCEPTION_KEY}_arm' in item:
                                tmp_key = f'{PERCEPTION_KEY}_arm'
                            else:
                                tmp_key = f'{PERCEPTION_KEY}_x86'
                            replace_str = f'{tmp_key}: :&nbsp; '
                            item_url = item.strip().replace(replace_str, '')
                            item_name = get_scene_name_from_url(item_url)
                            item_name = formater_name(item_name)
                            urls_perception.append((item_url, item_name))
        if len(urls_perception) != len(urls_check):
            all_uc = [i[1] for i in urls_check]
            all_u = [i[1] for i in urls_perception]
            faile_u = [i for i in all_u if i not in all_uc]
            msg = f"check {PERCEPTION_KEY} name not match:{faile_u}"
        return urls_perception, urls_check, od_tag, msg
    except requests.exceptions.RequestException as e:
        mag = f"get {url} consoleFull failed: {e}"
        return [], [], None, msg


def get_od_tag(url):
    od_tag = None
    job_jira = None
    con_url = url.strip() + 'consoleFull'
    response = request_url(con_url)
    if response is None:
        return None
    for i in response.text.split('\n'):
        if 'od_tag' in i:
            items = i.split(' ')
            for item in items:
                if 'od_tag' in item:
                    od_tag = item.split('=')[-1].strip().replace('"', '')
                elif 'integration_ticket' in item:
                    job_jira = item.split('=')[-1].strip().replace('"', '')
                if od_tag is not None and job_jira is not None:
                    return f'{od_tag}-job-{job_jira}'
    return None


def unzip_file(zip_file_path, extract_dir, base_name):
    target_path = os.path.join(extract_dir, base_name)
    try:
        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
            for i in zip_ref.namelist():
                old_name = os.path.join(extract_dir, i)
                if os.path.exists(old_name):
                    os.rename(old_name, target_path)
                    break
        if os.path.exists(target_path):
            return target_path
    except Exception as e:
        pass
        # print(f"unzip {zip_file_path} failed: {e}")
    return None


def read_files(filepath, save_dir, base_name):
    stop_bar_df = None
    stop_bar_df_no_time = None
    ad_df = None
    perception_dir = None
    files_dir = unzip_file(filepath, save_dir, base_name)
    if files_dir is None:
        return stop_bar_df, stop_bar_df_no_time, ad_df, perception_dir
    for file in os.listdir(files_dir):
        file_path = os.path.join(files_dir, file)
        if file.endswith('.csv'):
            if 'stop_bar_statistic_with_time' in file:
                stop_bar_df = pd.read_csv(file_path)
            elif 'stop_bar_statistic_without_time' in file:
                stop_bar_df_no_time = pd.read_csv(file_path)
            elif 'advance_detection_statistic_without_time' in file:
                ad_df = pd.read_csv(file_path)
        elif file.endswith('.tar.gz'):
            perception_dir = extract_tar_gz(file_path, files_dir)
    return stop_bar_df, stop_bar_df_no_time, ad_df, perception_dir


def extract_tar_gz(file_path, target_dir):
    new_dir = os.path.join(target_dir, os.path.basename(
        file_path).replace('.tar.gz', ''))
    os.makedirs(new_dir, exist_ok=True)
    with tarfile.open(file_path, "r:gz") as tar:
        tar.extractall(path=new_dir)
    return new_dir


def download_file(url, save_dir, base_name):
    try:
        zip_path = os.path.join(save_dir, f'{base_name}.zip')

        response = requests.get(url, stream=True, auth=('qi_zhang', '123'))
        response.raise_for_status()

        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return zip_path
    except requests.exceptions.RequestException as e:
        # print(f"download {url} failed: {e}")
        return None


def download_files(urls, zip_dir, unzip_dir):
    for url, base_name in urls:
        if base_name is None or base_name == 'None':
            continue
        zip_url = f'{url}artifact/SummaryResults.zip'
        zip_path = download_file(
            zip_url, save_dir=zip_dir, base_name=base_name)
        if zip_path is None or not os.path.exists(zip_path):
            continue
        read_files(zip_path, unzip_dir, base_name)


def get_data_name_from_url(url):
    key_str = "Archive:  /home/demo/jenkins_dir/workspace/PS_IntegrationTest/od_perception_check"
    split_str = "/mnt/ODPerceptionResult/"
    con_url = url.strip() + 'consoleFull'
    response = requests.get(con_url, auth=('qi_zhang', '123'))
    response = request_url(con_url)
    if response is None:
        return None
    for i in response.text.split('\n'):
        if key_str in i:
            items = i.replace(key_str, '').split(split_str)[-1]
            items = items.strip().split('/')[0].strip()
            items = items.strip().split('_')[1:]
            data_name = '_'.join(items)
            return data_name
    return None


def get_result_url(trigger_urls, save_dir='./data/'):
    od_perception_check_urls = None
    od_tag = None
    dir_name = None
    msg = ''
    for s_url in trigger_urls:
        dir_name = s_url.split(
            '/')[-2] if dir_name is None else dir_name + f'_{s_url.split("/")[-2]}'
        s_od_perception_urls, s_od_perception_check_urls, s_od_tag, s_url_msg = extract_od_perception_check_urls(
            s_url)
        if s_od_tag is None or len(s_od_perception_check_urls) == 0:
            msg += f"\n {s_url_msg}"
            continue
        if od_tag is None:
            od_tag = s_od_tag
            od_perception_check_urls = s_od_perception_check_urls
        else:
            if od_tag.split('-job-')[0] != s_od_tag.split('-job-')[0]:
                return f"od_tag not match: {od_tag} != {s_od_tag}"
            od_perception_check_urls.extend(s_od_perception_check_urls)
    if od_tag is None or len(od_perception_check_urls) == 0:
        return f"can not extract od_perception_check URL or od_tag: {trigger_urls}, len(s_od_perception_check_urls)={len(od_perception_check_urls)}, s_od_tag={od_tag}"

    dir_name = f'{od_tag}_{dir_name}'
    final_dir = os.path.join(save_dir, dir_name)
    if os.path.exists(final_dir):
        shutil.rmtree(final_dir)
    os.makedirs(final_dir, exist_ok=True)

    zip_dir = os.path.join(final_dir, 'org')
    unzip_dir = os.path.join(final_dir, 'unzip')
    os.makedirs(zip_dir, exist_ok=True)
    os.makedirs(unzip_dir, exist_ok=True)
    download_files(od_perception_check_urls, zip_dir, unzip_dir)


if __name__ == "__main__":
    url_to_check = [
        "http://jenkins.innotest.com:18080/job/PS_IntegrationTest/job/OD_X86_trigger/77/"
    ]
    save_dir = "./data7/"
    os.makedirs(save_dir, exist_ok=True)
    get_result_url(url_to_check, save_dir=save_dir)
