---
layout: default
title: Summaries
---

{% raw %}
{% for file in site.static_files %}
  {% if file.path contains 'summaries/' and file.extname == '.md' %}
    - [{{ file.name | remove: '.md' }}]({{ site.baseurl }}{{ file.path | remove: '.md' | append: '.html' }})
  {% endif %}
{% endfor %}
{% endraw %}