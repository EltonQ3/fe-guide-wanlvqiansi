"""Turn shared route HTML into links and readable content without browser scripts."""
import html
from html.parser import HTMLParser
from urllib.parse import parse_qs

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class StaticMarkup(HTMLParser):
    def __init__(self, route, characters):
        super().__init__(convert_charrefs=False)
        self.route, self.people = route, {}
        for character in characters:
            for name in [character['name'], *character['aliases']]:
                self.people[name] = character['id']
        self.output, self.stack, self.skip = [], [], 0

    def link(self, value):
        if value.startswith('assets/'):
            return '../' + value
        if not value.startswith('#'):
            return value
        path, _, query = value[1:].partition('?')
        parts = path.split('/')
        if parts[0] in ('route', 'story') and len(parts) > 1:
            anchor = '#' + parts[2] if len(parts) > 2 else ''
            return (anchor or '#') if parts[1] == self.route else parts[1] + '.html' + anchor
        if parts[0] == 'guide' and len(parts) > 1:
            return '../guide/' + parts[1] + '.html' + ('#' + parts[2] if len(parts) > 2 else '')
        if path == 'characters' and query:
            name = parse_qs(query).get('name', [''])[0]
            if name in self.people:
                return '../character/' + self.people[name] + '.html'
        return '../index.html' + value

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if self.skip:
            if tag not in VOID: self.skip += 1
            return
        if 'gamedate' in (attrs.get('class') or '').split():
            self.skip = 1
            return
        output_tag = tag
        if tag == 'button':
            if 'data-character' in attrs:
                attrs['href'] = '../character/' + attrs['data-character'] + '.html'
            elif 'data-class' in attrs:
                attrs['href'] = '../classes.html#' + attrs['data-class']
            elif 'data-scroll' in attrs:
                attrs['href'] = '#' + attrs['data-scroll']
            else:
                raise ValueError('Static route contains an unsupported button: ' + str(attrs))
            output_tag = 'a'
            attrs.pop('type', None)
        else:
            for key in ('href', 'src'):
                if attrs.get(key): attrs[key] = self.link(attrs[key])
        attrs = {key: value for key, value in attrs.items() if not key.startswith('data-') or key == 'data-theme'}
        encoded = ''.join(' ' + key if value is None else f' {key}="{html.escape(value, quote=True)}"' for key, value in attrs.items())
        self.output.append(f'<{output_tag}{encoded}>')
        if tag not in VOID: self.stack.append((tag, output_tag))

    def handle_endtag(self, tag):
        if self.skip:
            self.skip -= 1
            return
        if self.stack:
            original, output = self.stack.pop()
            if original != tag: raise ValueError(f'Unbalanced shared route markup: {original}, {tag}')
            self.output.append(f'</{output}>')

    def handle_data(self, data):
        if not self.skip: self.output.append(data)

    def handle_entityref(self, name):
        if not self.skip: self.output.append('&' + name + ';')

    def handle_charref(self, name):
        if not self.skip: self.output.append('&#' + name + ';')

def static_markup(markup, route, characters):
    parser = StaticMarkup(route, characters)
    parser.feed(markup)
    parser.close()
    if parser.stack or parser.skip: raise ValueError('Unclosed shared route markup')
    return '\n'.join(line.rstrip() for line in ''.join(parser.output).split('\n'))
